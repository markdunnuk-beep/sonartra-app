import { AssessmentResultRow, AssessmentResultSignalRow, AssessmentRow } from '@/lib/assessment-types';
import { queryDb } from '@/lib/db';
import {
  AssessmentResultSnapshotPayload,
  PersistedAssessmentResultSignal,
  ResponseQualityMetadata,
  ResultFailureMetadata,
} from '@/lib/scoring/types';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';

export interface IndividualIntelligenceSignalSummary extends PersistedAssessmentResultSignal {}

export interface IndividualIntelligenceLayerSummary {
  layerKey: string;
  totalRawValue: number;
  topSignalKey: string | null;
  signalCount: number;
}

export interface IndividualIntelligenceSummaryMetadata {
  assessmentResultId: string;
  scoringModelKey: string;
  snapshotVersion: number;
  scoredAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IndividualIntelligenceFailedState {
  reason: 'result_generation_failed';
  message: string;
  failure: ResultFailureMetadata | null;
}

export interface IndividualIntelligenceEmptyState {
  reason: 'no_completed_assessment' | 'result_missing';
  message: string;
}

export interface IndividualIntelligenceResultContract {
  hasResult: boolean;
  resultStatus: 'complete' | 'failed' | 'empty' | 'unauthenticated';
  assessmentId: string | null;
  completedAt: string | null;
  versionKey: string | null;
  summary: IndividualIntelligenceSummaryMetadata | null;
  layerSummaries: IndividualIntelligenceLayerSummary[];
  signalSummaries: IndividualIntelligenceSignalSummary[];
  responseQuality: ResponseQualityMetadata | null;
  emptyState: IndividualIntelligenceEmptyState | null;
  failedState: IndividualIntelligenceFailedState | null;
}

interface IndividualIntelligenceDependencies {
  getLatestCompletedAssessmentForUser: (userId: string) => Promise<AssessmentRow | null>;
  getPreferredResultForAssessment: (assessmentId: string) => Promise<AssessmentResultRow | null>;
  getSignalsByResultId: (assessmentResultId: string) => Promise<AssessmentResultSignalRow[]>;
  resolveAuthenticatedUserId: () => Promise<string | null>;
}

const defaultDependencies: IndividualIntelligenceDependencies = {
  async getLatestCompletedAssessmentForUser(userId) {
    const result = await queryDb<AssessmentRow>(
      `SELECT id, user_id, organisation_id, assessment_version_id, status, started_at, completed_at,
              last_activity_at, progress_count, progress_percent, current_question_index, scoring_status,
              source, metadata_json, created_at, updated_at
       FROM assessments
       WHERE user_id = $1
         AND status = 'completed'
       ORDER BY completed_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [userId]
    );

    return result.rows[0] ?? null;
  },
  async getPreferredResultForAssessment(assessmentId) {
    const result = await queryDb<AssessmentResultRow>(
      `SELECT id, assessment_id, assessment_version_id, version_key, scoring_model_key, snapshot_version, status,
              result_payload, response_quality_payload, report_artifact_json, completed_at, scored_at, created_at, updated_at
       FROM assessment_results
       WHERE assessment_id = $1
         AND status IN ('complete', 'failed')
       ORDER BY
         CASE status
           WHEN 'complete' THEN 0
           WHEN 'failed' THEN 1
           ELSE 2
         END,
         created_at DESC
       LIMIT 1`,
      [assessmentId]
    );

    return result.rows[0] ?? null;
  },
  async getSignalsByResultId(assessmentResultId) {
    const result = await queryDb<AssessmentResultSignalRow>(
      `SELECT id, assessment_result_id, layer_key, signal_key, raw_total, max_possible,
              normalised_score, relative_share, rank_in_layer, is_primary, is_secondary,
              percentile_placeholder, confidence_flag, created_at
       FROM assessment_result_signals
       WHERE assessment_result_id = $1`,
      [assessmentResultId]
    );

    return result.rows;
  },
  async resolveAuthenticatedUserId() {
    const user = await resolveAuthenticatedAppUser();
    return user?.dbUserId ?? null;
  },
};

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

function mapSignals(signals: AssessmentResultSignalRow[]): IndividualIntelligenceSignalSummary[] {
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

function mapLayerSummaries(
  snapshot: AssessmentResultSnapshotPayload | null,
  signals: IndividualIntelligenceSignalSummary[]
): IndividualIntelligenceLayerSummary[] {
  if (snapshot?.layers?.length) {
    return snapshot.layers.map((layer) => ({
      layerKey: layer.layerKey,
      totalRawValue: layer.totalRawValue,
      topSignalKey: layer.signals.find((signal) => signal.isPrimary)?.signalKey ?? layer.signals[0]?.signalKey ?? null,
      signalCount: layer.signals.length,
    }));
  }

  const grouped = new Map<string, IndividualIntelligenceSignalSummary[]>();
  signals.forEach((signal) => {
    const current = grouped.get(signal.layerKey) ?? [];
    current.push(signal);
    grouped.set(signal.layerKey, current);
  });

  return [...grouped.entries()].map(([layerKey, layerSignals]) => ({
    layerKey,
    totalRawValue: layerSignals.reduce((sum, signal) => sum + signal.rawTotal, 0),
    topSignalKey: layerSignals.find((signal) => signal.isPrimary)?.signalKey ?? layerSignals[0]?.signalKey ?? null,
    signalCount: layerSignals.length,
  }));
}

export async function getAuthenticatedIndividualIntelligenceResult(
  dependencies: Partial<IndividualIntelligenceDependencies> = {}
): Promise<IndividualIntelligenceResultContract> {
  const resolvedDependencies = { ...defaultDependencies, ...dependencies };
  const userId = await resolvedDependencies.resolveAuthenticatedUserId();

  if (!userId) {
    return {
      hasResult: false,
      resultStatus: 'unauthenticated',
      assessmentId: null,
      completedAt: null,
      versionKey: null,
      summary: null,
      layerSummaries: [],
      signalSummaries: [],
      responseQuality: null,
      emptyState: null,
      failedState: null,
    };
  }

  const assessment = await resolvedDependencies.getLatestCompletedAssessmentForUser(userId);

  if (!assessment) {
    return {
      hasResult: false,
      resultStatus: 'empty',
      assessmentId: null,
      completedAt: null,
      versionKey: null,
      summary: null,
      layerSummaries: [],
      signalSummaries: [],
      responseQuality: null,
      emptyState: {
        reason: 'no_completed_assessment',
        message: 'No completed Individual Intelligence assessment exists for this user.',
      },
      failedState: null,
    };
  }

  const preferredResult = await resolvedDependencies.getPreferredResultForAssessment(assessment.id);

  if (!preferredResult) {
    return {
      hasResult: false,
      resultStatus: 'empty',
      assessmentId: assessment.id,
      completedAt: assessment.completed_at,
      versionKey: null,
      summary: null,
      layerSummaries: [],
      signalSummaries: [],
      responseQuality: null,
      emptyState: {
        reason: 'result_missing',
        message: 'Assessment is complete but no persisted result snapshot is available.',
      },
      failedState: null,
    };
  }

  if (preferredResult.status === 'failed') {
    return {
      hasResult: false,
      resultStatus: 'failed',
      assessmentId: assessment.id,
      completedAt: assessment.completed_at,
      versionKey: preferredResult.version_key,
      summary: {
        assessmentResultId: preferredResult.id,
        scoringModelKey: preferredResult.scoring_model_key,
        snapshotVersion: preferredResult.snapshot_version,
        scoredAt: preferredResult.scored_at,
        createdAt: preferredResult.created_at,
        updatedAt: preferredResult.updated_at,
      },
      layerSummaries: [],
      signalSummaries: [],
      responseQuality: null,
      emptyState: null,
      failedState: {
        reason: 'result_generation_failed',
        message: 'Result generation failed for the latest completed assessment.',
        failure: parseFailure(preferredResult.result_payload),
      },
    };
  }

  const signalSummaries = mapSignals(await resolvedDependencies.getSignalsByResultId(preferredResult.id));
  const snapshot = parseSnapshot(preferredResult.result_payload);

  return {
    hasResult: true,
    resultStatus: 'complete',
    assessmentId: assessment.id,
    completedAt: assessment.completed_at,
    versionKey: preferredResult.version_key,
    summary: {
      assessmentResultId: preferredResult.id,
      scoringModelKey: preferredResult.scoring_model_key,
      snapshotVersion: preferredResult.snapshot_version,
      scoredAt: preferredResult.scored_at,
      createdAt: preferredResult.created_at,
      updatedAt: preferredResult.updated_at,
    },
    layerSummaries: mapLayerSummaries(snapshot, signalSummaries),
    signalSummaries,
    responseQuality: parseResponseQuality(preferredResult.response_quality_payload),
    emptyState: null,
    failedState: null,
  };
}
