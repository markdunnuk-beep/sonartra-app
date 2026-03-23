import { AssessmentRow, AssessmentResultRow, AssessmentResultSignalRow } from '@/lib/assessment-types';
import { queryDb } from '@/lib/db';
import {
  AssessmentResultReadResponse,
  AssessmentResultSnapshotPayload,
  PersistedAssessmentResultSignal,
  ResponseQualityMetadata,
  ResultFailureMetadata,
} from '@/lib/scoring/types';
import { getAssessmentResultByAssessmentId, getAssessmentResultSignalsByResultId } from '@/lib/server/assessment-results';

interface AssessmentResultReadDependencies {
  getAssessmentById: (assessmentId: string, ownerUserId?: string) => Promise<AssessmentRow | null>;
  getResultByAssessmentId: (assessmentId: string) => Promise<AssessmentResultRow | null>;
  getSignalsByResultId: (assessmentResultId: string) => Promise<AssessmentResultSignalRow[]>;
}

export type AssessmentResultReadServiceResult =
  | { kind: 'not_found' }
  | { kind: 'ok'; body: AssessmentResultReadResponse };

const defaultDependencies: AssessmentResultReadDependencies = {
  async getAssessmentById(assessmentId: string, ownerUserId?: string) {
    const result = await queryDb<AssessmentRow>(
      `SELECT id, user_id, organisation_id, assessment_version_id, status, started_at, completed_at,
              last_activity_at, progress_count, progress_percent, current_question_index, scoring_status,
              source, metadata_json, created_at, updated_at
       FROM assessments
       WHERE id = $1
         AND ($2::uuid IS NULL OR user_id = $2::uuid)`,
      [assessmentId, ownerUserId ?? null]
    );

    return result.rows[0] ?? null;
  },
  getResultByAssessmentId: getAssessmentResultByAssessmentId,
  getSignalsByResultId: getAssessmentResultSignalsByResultId,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function parseSnapshot(payload: Record<string, unknown> | null): AssessmentResultSnapshotPayload | null {
  if (!payload || typeof payload !== 'object') return null;

  return payload as unknown as AssessmentResultSnapshotPayload;
}

function parseResponseQuality(payload: Record<string, unknown> | null): ResponseQualityMetadata | null {
  if (!payload || typeof payload !== 'object') return null;

  return payload as unknown as ResponseQualityMetadata;
}

function parseFailure(payload: Record<string, unknown> | null): ResultFailureMetadata | null {
  if (!payload || typeof payload !== 'object') return null;

  const value = payload as { failure?: ResultFailureMetadata };
  return value.failure ?? null;
}

function sortSignals(signals: AssessmentResultSignalRow[]): PersistedAssessmentResultSignal[] {
  return [...signals]
    .sort((a, b) => {
      if (a.layer_key !== b.layer_key) return a.layer_key.localeCompare(b.layer_key);

      const rankA = a.rank_in_layer ?? Number.MAX_SAFE_INTEGER;
      const rankB = b.rank_in_layer ?? Number.MAX_SAFE_INTEGER;
      if (rankA !== rankB) return rankA - rankB;

      return a.signal_key.localeCompare(b.signal_key);
    })
    .map((signal) => ({
      layerKey: signal.layer_key,
      signalKey: signal.signal_key,
      rawTotal: Number(signal.raw_total),
      maxPossible: Number(signal.max_possible),
      normalisedScore: Number(signal.normalised_score),
      relativeShare: Number(signal.relative_share),
      rankInLayer: signal.rank_in_layer,
      isPrimary: signal.is_primary,
      isSecondary: signal.is_secondary,
    }));
}

function parseV2LiveResult(payload: Record<string, unknown> | null) {
  if (!isRecord(payload) || payload.contractVersion !== 'package_contract_v2') {
    return null
  }

  return {
    webSummaryOutputs: Array.isArray(payload.materializedOutputs && isRecord(payload.materializedOutputs) ? payload.materializedOutputs.webSummaryOutputs : null)
      ? (payload.materializedOutputs as { webSummaryOutputs: unknown[] }).webSummaryOutputs
      : [],
    integrityNotices: Array.isArray(payload.materializedOutputs && isRecord(payload.materializedOutputs) ? payload.materializedOutputs.integrityNotices : null)
      ? (payload.materializedOutputs as { integrityNotices: unknown[] }).integrityNotices
      : [],
    technicalDiagnostics: Array.isArray(payload.materializedOutputs && isRecord(payload.materializedOutputs) ? payload.materializedOutputs.technicalDiagnostics : null)
      ? (payload.materializedOutputs as { technicalDiagnostics: unknown[] }).technicalDiagnostics
      : [],
    evaluation: isRecord(payload.evaluation) ? payload.evaluation : null,
    packageMetadata: isRecord(payload.packageMetadata) ? payload.packageMetadata : null,
  }
}

export async function getAssessmentResultReadModel(
  assessmentId: string,
  ownerUserId?: string,
  dependencies: AssessmentResultReadDependencies = defaultDependencies
): Promise<AssessmentResultReadServiceResult> {
  const assessment = await dependencies.getAssessmentById(assessmentId, ownerUserId);

  if (!assessment) {
    return { kind: 'not_found' };
  }

  if (assessment.status !== 'completed') {
    return {
      kind: 'ok',
      body: {
        ok: true,
        assessmentId,
        assessmentStatus: assessment.status,
        scoringStatus: assessment.scoring_status,
        result: {
          availability: 'unavailable',
          reason: 'assessment_incomplete',
          message: 'Assessment has not been completed yet.',
        },
      },
    };
  }

  const result = await dependencies.getResultByAssessmentId(assessmentId);

  if (!result) {
    return {
      kind: 'ok',
      body: {
        ok: true,
        assessmentId,
        assessmentStatus: assessment.status,
        scoringStatus: assessment.scoring_status,
        result: {
          availability: 'unavailable',
          reason: 'result_missing',
          message: 'Assessment is complete but no persisted result snapshot is available yet.',
        },
      },
    };
  }

  if (result.status === 'failed') {
    return {
      kind: 'ok',
      body: {
        ok: true,
        assessmentId,
        assessmentStatus: assessment.status,
        scoringStatus: assessment.scoring_status,
        result: {
          availability: 'available',
          status: 'failed',
          id: result.id,
          assessmentVersionId: result.assessment_version_id,
          versionKey: result.version_key,
          scoringModelKey: result.scoring_model_key,
          snapshotVersion: result.snapshot_version,
          completedAt: result.completed_at,
          scoredAt: result.scored_at,
          createdAt: result.created_at,
          updatedAt: result.updated_at,
          failure: parseFailure(result.result_payload),
          signals: [],
          contractVersion: isRecord(result.result_payload) && result.result_payload.contractVersion === 'package_contract_v2' ? 'package_contract_v2' : 'legacy_v1',
        },
      },
    } as const;
  }

  const v2LiveResult = parseV2LiveResult(result.result_payload)
  if (v2LiveResult) {
    return {
      kind: 'ok',
      body: {
        ok: true,
        assessmentId,
        assessmentStatus: assessment.status,
        scoringStatus: assessment.scoring_status,
        result: {
          availability: 'available',
          status: 'complete',
          id: result.id,
          assessmentVersionId: result.assessment_version_id,
          versionKey: result.version_key,
          scoringModelKey: result.scoring_model_key,
          snapshotVersion: result.snapshot_version,
          completedAt: result.completed_at,
          scoredAt: result.scored_at,
          createdAt: result.created_at,
          updatedAt: result.updated_at,
          snapshot: result.result_payload,
          responseQuality: result.response_quality_payload,
          signals: [],
          contractVersion: 'package_contract_v2',
          liveRuntime: v2LiveResult,
        },
      },
    } as const;
  }

  const signalRows = await dependencies.getSignalsByResultId(result.id);

  return {
    kind: 'ok',
    body: {
      ok: true,
      assessmentId,
      assessmentStatus: assessment.status,
      scoringStatus: assessment.scoring_status,
      result: {
        availability: 'available',
        status: 'complete',
        id: result.id,
        assessmentVersionId: result.assessment_version_id,
        versionKey: result.version_key,
        scoringModelKey: result.scoring_model_key,
        snapshotVersion: result.snapshot_version,
        completedAt: result.completed_at,
        scoredAt: result.scored_at,
        createdAt: result.created_at,
        updatedAt: result.updated_at,
        snapshot: parseSnapshot(result.result_payload) as unknown as Record<string, unknown> | null,
        responseQuality: parseResponseQuality(result.response_quality_payload) as unknown as Record<string, unknown> | null,
        signals: sortSignals(signalRows),
        contractVersion: 'legacy_v1',
      },
    },
  } as const;
}
