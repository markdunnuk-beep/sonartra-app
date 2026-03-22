import { PoolClient } from 'pg';

import type { CompleteAssessmentResponse } from '@/lib/assessment-types';
import { queryDb, withTransaction } from '@/lib/db';
import { SIGNAL_CODE_TO_LAYER, WPLP80_SCORING_MODEL_KEY } from '@/lib/scoring/constants';
import { scoreAssessment } from '@/lib/scoring/engine';
import {
  AssessmentResponseInput,
  PersistFailedAssessmentResultInput,
  PersistSuccessfulAssessmentResultInput,
  ResultFailureMetadata,
  ResultFailureStage,
  ScoringEngineInput,
  SignalMappingInput,
} from '@/lib/scoring/types';
import { getLatestAssessmentResultSnapshot, persistFailedAssessmentResult, persistSuccessfulAssessmentResult } from '@/lib/server/assessment-results';

interface CompletionCheckRow {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  total_questions: number;
  assessment_version_id: string;
  version_key: string;
  started_at: string | null;
  completed_at: string | null;
  scoring_status: 'not_scored' | 'pending' | 'scored' | 'failed';
}

interface AssessmentResponseRow {
  question_id: number;
  response_value: number;
  response_time_ms: number | null;
}

interface MappingRow {
  question_id: number;
  response_value: number;
  signal_code: string;
  signal_weight: string;
}

export interface CompleteAssessmentResult {
  httpStatus: number;
  body: CompleteAssessmentResponse;
}

interface CompletionDependencies {
  fetchScoringInput: (assessment: CompletionCheckRow) => Promise<ScoringEngineInput>;
  score: typeof scoreAssessment;
  persistSuccess: (input: PersistSuccessfulAssessmentResultInput, client?: PoolClient) => Promise<{ assessmentResultId: string }>;
  persistFailed: (input: PersistFailedAssessmentResultInput, client?: PoolClient) => Promise<{ assessmentResultId: string }>;
}

interface CompletionRuntimeDependencies {
  runInTransaction: typeof withTransaction;
  getLatestResultSnapshot: typeof getLatestAssessmentResultSnapshot;
}

interface DbErrorLike {
  code?: string;
  detail?: string;
  hint?: string;
  message?: string;
}

function isMissingRelationError(error: unknown): boolean {
  return Boolean((error as DbErrorLike | null)?.code === '42P01');
}

const defaultDependencies: CompletionDependencies = {
  fetchScoringInput,
  score: scoreAssessment,
  persistSuccess: persistSuccessfulAssessmentResult,
  persistFailed: persistFailedAssessmentResult,
};

const defaultRuntimeDependencies: CompletionRuntimeDependencies = {
  runInTransaction: withTransaction,
  getLatestResultSnapshot: getLatestAssessmentResultSnapshot,
};

function toFailureMetadata(assessmentVersionKey: string, stage: ResultFailureStage, error: unknown): ResultFailureMetadata {
  const safeMessage = error instanceof Error ? error.message : 'Unexpected scoring pipeline failure.';

  return {
    stage,
    category: 'runtime_error',
    code: 'RESULT_GENERATION_FAILED',
    message: safeMessage,
    occurredAt: new Date().toISOString(),
    assessmentVersionKey,
  };
}

async function fetchScoringInput(assessment: CompletionCheckRow): Promise<ScoringEngineInput> {
  const responsesResult = await queryDb<AssessmentResponseRow>(
    `SELECT question_id, response_value, response_time_ms
     FROM assessment_responses
     WHERE assessment_id = $1
     ORDER BY question_id ASC`,
    [assessment.id]
  );
  const mappingsResult = await queryDb<MappingRow>(
    `SELECT ar.question_id, ar.response_value, m.signal_code, m.signal_weight
     FROM assessment_responses ar
     INNER JOIN assessments a ON a.id = ar.assessment_id
     INNER JOIN assessment_question_sets qs ON qs.assessment_version_id = a.assessment_version_id AND qs.is_active = TRUE
     INNER JOIN assessment_questions q ON q.question_set_id = qs.id AND q.question_number = ar.question_id AND q.is_active = TRUE
     INNER JOIN assessment_question_options o ON o.question_id = q.id AND o.numeric_value = ar.response_value
     INNER JOIN assessment_option_signal_mappings m ON m.question_option_id = o.id
     WHERE ar.assessment_id = $1`,
    [assessment.id]
  );

  const responses: AssessmentResponseInput[] = responsesResult.rows.map((row) => ({
    questionId: row.question_id,
    responseValue: row.response_value,
    responseTimeMs: row.response_time_ms,
  }));

  const mappings: SignalMappingInput[] = mappingsResult.rows.map((row) => {
    const layerKey = SIGNAL_CODE_TO_LAYER[row.signal_code];

    if (!layerKey) {
      throw new Error(`Unknown layer mapping for signal code: ${row.signal_code}`);
    }

    return {
      questionId: row.question_id,
      responseValue: row.response_value,
      signalCode: row.signal_code as SignalMappingInput['signalCode'],
      signalWeight: Number(row.signal_weight),
      layerKey,
    };
  });

  return {
    assessmentId: assessment.id,
    assessmentVersionId: assessment.assessment_version_id,
    versionKey: assessment.version_key,
    scoringModelKey: WPLP80_SCORING_MODEL_KEY,
    snapshotVersion: 1,
    completedAt: assessment.completed_at,
    startedAt: assessment.started_at,
    responses,
    mappings,
  };
}

async function markScoringStatus(client: PoolClient, assessmentId: string, scoringStatus: 'pending' | 'scored' | 'failed') {
  await client.query(
    `UPDATE assessments
     SET scoring_status = $2,
         updated_at = NOW()
     WHERE id = $1`,
    [assessmentId, scoringStatus]
  );
}

export async function completeAssessmentWithResults(
  assessmentId: string,
  dependencies: CompletionDependencies = defaultDependencies,
  runtimeDependencies: CompletionRuntimeDependencies = defaultRuntimeDependencies
): Promise<CompleteAssessmentResult> {
  const lifecycle = await runtimeDependencies.runInTransaction(async (client) => {
    let stage = 'load_assessment';

    const logFailure = (error: unknown) => {
      const dbError = error as DbErrorLike;

      console.error('[assessment.complete] lifecycle failed', {
        assessmentId,
        stage,
        code: dbError?.code,
        message: dbError?.message ?? (error instanceof Error ? error.message : 'Unknown error'),
        detail: dbError?.detail,
        hint: dbError?.hint,
      });
    };

    try {
    const checkResult = await client.query<CompletionCheckRow>(
      `SELECT a.id, a.status, av.total_questions, a.assessment_version_id, av.key AS version_key,
              a.started_at, a.completed_at, a.scoring_status
       FROM assessments a
       INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
       WHERE a.id = $1
       FOR UPDATE`,
      [assessmentId]
    );

    const assessment = checkResult.rows[0];

    if (!assessment) {
      return { kind: 'error' as const, httpStatus: 404, error: 'Assessment not found.' };
    }

    stage = 'validate_response_count';
    const responsesCountResult = await client.query<{ response_count: string }>(
      `SELECT COUNT(*)::int AS response_count
       FROM assessment_responses
       WHERE assessment_id = $1`,
      [assessmentId]
    );

    const responseCount = Number(responsesCountResult.rows[0]?.response_count ?? 0);

    if (responseCount < assessment.total_questions) {
      return {
        kind: 'error' as const,
        httpStatus: 400,
        error: `Assessment cannot be completed. Expected ${assessment.total_questions} responses, found ${responseCount}.`,
      };
    }

    if (assessment.status !== 'completed') {
      stage = 'mark_completed';
      const updateResult = await client.query<{ completed_at: string }>(
        `UPDATE assessments
         SET
           status = 'completed',
           completed_at = NOW(),
           last_activity_at = NOW(),
           scoring_status = 'pending',
           progress_count = $2,
           progress_percent = 100,
           current_question_index = GREATEST(current_question_index, $2),
           updated_at = NOW()
         WHERE id = $1
         RETURNING completed_at`,
        [assessmentId, assessment.total_questions]
      );

      assessment.completed_at = updateResult.rows[0]?.completed_at ?? assessment.completed_at;
      assessment.scoring_status = 'pending';
    }

    stage = 'load_latest_result_snapshot';
    let latestResult: { id: string; status: 'pending' | 'complete' | 'failed' } | null = null;

    try {
      latestResult = await runtimeDependencies.getLatestResultSnapshot(assessmentId, client);
    } catch (error) {
      if (!isMissingRelationError(error)) {
        throw error;
      }

      const dbError = error as DbErrorLike;

      console.error('[assessment.complete] assessment_results table unavailable; proceeding without existing result snapshot', {
        assessmentId,
        stage,
        code: dbError?.code,
        message: dbError?.message,
      });
    }

    return {
      kind: 'ok' as const,
      assessment,
      latestResult,
      shouldScore: !((latestResult?.status === 'complete' && assessment.scoring_status === 'scored') || latestResult?.status === 'pending'),
    };
    } catch (error) {
      logFailure(error);
      throw error;
    }
  });

  if (lifecycle.kind === 'error') {
    return { httpStatus: lifecycle.httpStatus, body: { ok: false, error: lifecycle.error } };
  }

  if (!lifecycle.shouldScore) {
    return {
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId,
        assessmentStatus: 'completed',
        resultStatus:
          lifecycle.latestResult?.status === 'failed'
            ? 'failed'
            : lifecycle.latestResult?.status === 'pending'
              ? 'pending'
              : 'succeeded',
        resultId: lifecycle.latestResult?.id ?? null,
      },
    };
  }

  try {
    const scoringInput = await dependencies.fetchScoringInput(lifecycle.assessment);
    const scored = dependencies.score(scoringInput);

    const successInput: PersistSuccessfulAssessmentResultInput = {
      assessmentId,
      assessmentVersionId: lifecycle.assessment.assessment_version_id,
      versionKey: lifecycle.assessment.version_key,
      scoringModelKey: WPLP80_SCORING_MODEL_KEY,
      snapshotVersion: 1,
      resultPayload: scored.snapshot,
      responseQualityPayload: scored.responseQuality,
      completedAt: lifecycle.assessment.completed_at,
      scoredAt: scored.snapshot.scoredAt,
      signalRows: scored.signals,
    };

    const success = await runtimeDependencies.runInTransaction(async (client) => {
      const persisted = await dependencies.persistSuccess(successInput, client);
      await markScoringStatus(client, assessmentId, 'scored');

      return persisted;
    });

    return {
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId,
        assessmentStatus: 'completed',
        resultStatus: 'succeeded',
        resultId: success.assessmentResultId,
      },
    };
  } catch (error) {
    console.error('[assessment.complete] scoring pipeline failed', {
      assessmentId,
      stage: 'completion_orchestration',
      message: error instanceof Error ? error.message : 'Unexpected error',
    });

    const metadata = toFailureMetadata(lifecycle.assessment.version_key, 'completion_orchestration', error);

    const failedInput: PersistFailedAssessmentResultInput = {
      assessmentId,
      assessmentVersionId: lifecycle.assessment.assessment_version_id,
      versionKey: lifecycle.assessment.version_key,
      scoringModelKey: WPLP80_SCORING_MODEL_KEY,
      snapshotVersion: 1,
      completedAt: lifecycle.assessment.completed_at,
      scoredAt: null,
      failure: metadata,
    };

    let failedResultId: string | null = null;

    try {
      const failed = await runtimeDependencies.runInTransaction(async (client) => {
        const persisted = await dependencies.persistFailed(failedInput, client);
        await markScoringStatus(client, assessmentId, 'failed');

        return persisted;
      });

      failedResultId = failed.assessmentResultId;
    } catch (persistError) {
      console.error('[assessment.complete] failed to persist failed result metadata', {
        assessmentId,
        stage: 'result_persist',
        message: persistError instanceof Error ? persistError.message : 'Unexpected error',
      });

      await runtimeDependencies.runInTransaction(async (client) => markScoringStatus(client, assessmentId, 'failed'));
    }

    return {
      httpStatus: 200,
      body: {
        ok: true,
        assessmentId,
        assessmentStatus: 'completed',
        resultStatus: 'failed',
        resultId: failedResultId,
        warning: {
          code: 'RESULT_GENERATION_FAILED',
          message: 'Assessment was completed but result generation failed.',
        },
      },
    };
  }
}
