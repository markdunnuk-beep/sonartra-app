import assert from 'node:assert/strict';
import test from 'node:test';

import { AssessmentResultRow, AssessmentResultSignalRow, AssessmentRow } from '../lib/assessment-types';
import { getAuthenticatedIndividualIntelligenceResult } from '../lib/server/individual-intelligence-result';

const completedAssessment: AssessmentRow = {
  id: 'assessment-1',
  user_id: 'user-1',
  organisation_id: null,
  assessment_version_id: 'version-1',
  status: 'completed',
  started_at: '2026-01-01T10:00:00.000Z',
  completed_at: '2026-01-01T10:05:00.000Z',
  last_activity_at: '2026-01-01T10:05:00.000Z',
  progress_count: 80,
  progress_percent: '100',
  current_question_index: 80,
  scoring_status: 'scored',
  source: 'web',
  metadata_json: null,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:05:00.000Z',
};

const completeResult: AssessmentResultRow = {
  id: 'result-complete',
  assessment_id: 'assessment-1',
  assessment_version_id: 'version-1',
  version_key: 'wplp80-v1',
  scoring_model_key: 'wplp80-signal-model-v1',
  snapshot_version: 1,
  status: 'complete',
  result_payload: {
    assessmentId: 'assessment-1',
    assessmentVersionId: 'version-1',
    versionKey: 'wplp80-v1',
    scoringModelKey: 'wplp80-signal-model-v1',
    snapshotVersion: 1,
    scoredAt: '2026-01-01T10:05:10.000Z',
    layers: [
      {
        layerKey: 'behaviour_style',
        totalRawValue: 12,
        signals: [
          { signalKey: 'Core_Driver', isPrimary: true },
          { signalKey: 'Core_Analyst', isPrimary: false },
        ],
      },
    ],
    responseQuality: {
      completionDurationSeconds: 300,
      responseQualityStatus: 'normal',
      responseQualityFlags: [],
      timingSummary: { hasResponseTimings: true, timedResponseCount: 80 },
    },
  },
  response_quality_payload: {
    completionDurationSeconds: 300,
    responseQualityStatus: 'normal',
    responseQualityFlags: [],
    timingSummary: { hasResponseTimings: true, timedResponseCount: 80 },
  },
  completed_at: '2026-01-01T10:05:00.000Z',
  scored_at: '2026-01-01T10:05:10.000Z',
  created_at: '2026-01-01T10:05:11.000Z',
  updated_at: '2026-01-01T10:05:11.000Z',
};

const failedResult: AssessmentResultRow = {
  ...completeResult,
  id: 'result-failed',
  status: 'failed',
  result_payload: {
    failure: {
      stage: 'completion_orchestration',
      category: 'runtime_error',
      code: 'RESULT_GENERATION_FAILED',
      message: 'Scoring failed',
      occurredAt: '2026-01-01T10:05:12.000Z',
      assessmentVersionKey: 'wplp80-v1',
    },
  },
  response_quality_payload: null,
};

const signals: AssessmentResultSignalRow[] = [
  {
    id: 'sig-1',
    assessment_result_id: 'result-complete',
    layer_key: 'behaviour_style',
    signal_key: 'Core_Driver',
    raw_total: '8',
    max_possible: '12',
    normalised_score: '0.666667',
    relative_share: '0.8',
    rank_in_layer: 1,
    is_primary: true,
    is_secondary: false,
    percentile_placeholder: null,
    confidence_flag: null,
    created_at: '2026-01-01T10:05:11.000Z',
  },
  {
    id: 'sig-2',
    assessment_result_id: 'result-complete',
    layer_key: 'behaviour_style',
    signal_key: 'Core_Analyst',
    raw_total: '4',
    max_possible: '12',
    normalised_score: '0.333333',
    relative_share: '0.2',
    rank_in_layer: 2,
    is_primary: false,
    is_secondary: true,
    percentile_placeholder: null,
    confidence_flag: null,
    created_at: '2026-01-01T10:05:11.000Z',
  },
];

test('returns unauthenticated state when auth context is missing', async () => {
  const result = await getAuthenticatedIndividualIntelligenceResult({
    resolveAuthenticatedUserId: async () => null,
    getLatestCompletedAssessmentForUser: async () => completedAssessment,
    getPreferredResultForAssessment: async () => completeResult,
    getSignalsByResultId: async () => signals,
  });

  assert.equal(result.resultStatus, 'unauthenticated');
  assert.equal(result.hasResult, false);
});

test('scopes assessment lookup to authenticated user and returns empty state when no owned completion exists', async () => {
  let seenUserId: string | null = null;

  const result = await getAuthenticatedIndividualIntelligenceResult({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestCompletedAssessmentForUser: async (userId) => {
      seenUserId = userId;
      return null;
    },
    getPreferredResultForAssessment: async () => completeResult,
    getSignalsByResultId: async () => signals,
  });

  assert.equal(seenUserId, 'user-1');
  assert.equal(result.resultStatus, 'empty');
  assert.equal(result.emptyState?.reason, 'no_completed_assessment');
});

test('prefers a successful persisted result when complete and failed snapshots both exist', async () => {
  const result = await getAuthenticatedIndividualIntelligenceResult({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestCompletedAssessmentForUser: async () => completedAssessment,
    getPreferredResultForAssessment: async () => completeResult,
    getSignalsByResultId: async () => signals,
  });

  assert.equal(result.resultStatus, 'complete');
  assert.equal(result.hasResult, true);
  assert.equal(result.signalSummaries[0]?.signalKey, 'Core_Driver');
  assert.equal(result.layerSummaries[0]?.topSignalKey, 'Core_Driver');
});

test('returns failed result state when latest completion exists but generation failed', async () => {
  const result = await getAuthenticatedIndividualIntelligenceResult({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestCompletedAssessmentForUser: async () => completedAssessment,
    getPreferredResultForAssessment: async () => failedResult,
    getSignalsByResultId: async () => signals,
  });

  assert.equal(result.resultStatus, 'failed');
  assert.equal(result.hasResult, false);
  assert.equal(result.failedState?.reason, 'result_generation_failed');
  assert.equal(result.failedState?.failure?.code, 'RESULT_GENERATION_FAILED');
});

test('returns empty state when latest completed assessment has no persisted result rows', async () => {
  const result = await getAuthenticatedIndividualIntelligenceResult({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestCompletedAssessmentForUser: async () => completedAssessment,
    getPreferredResultForAssessment: async () => null,
    getSignalsByResultId: async () => signals,
  });

  assert.equal(result.resultStatus, 'empty');
  assert.equal(result.emptyState?.reason, 'result_missing');
  assert.equal(result.assessmentId, 'assessment-1');
});
