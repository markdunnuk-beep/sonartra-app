import assert from 'node:assert/strict';
import test from 'node:test';

import { AssessmentRow, AssessmentResultRow, AssessmentResultSignalRow } from '../lib/assessment-types';
import { getAssessmentResultReadModel } from '../lib/server/assessment-result-read';

const baseAssessment: AssessmentRow = {
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

const baseResult: AssessmentResultRow = {
  id: 'result-1',
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
    layers: [],
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

function buildSignals(): AssessmentResultSignalRow[] {
  return [
    {
      id: 'sig-2',
      assessment_result_id: 'result-1',
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
    {
      id: 'sig-1',
      assessment_result_id: 'result-1',
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
  ];
}

test('returns successful persisted snapshot with deterministically ordered signals', async () => {
  const result = await getAssessmentResultReadModel('assessment-1', {
    getAssessmentById: async () => baseAssessment,
    getResultByAssessmentId: async () => baseResult,
    getSignalsByResultId: async () => buildSignals(),
  });

  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;

  assert.equal(result.body.result.availability, 'available');
  if (result.body.result.availability !== 'available' || result.body.result.status !== 'complete') return;

  assert.equal(result.body.result.signals[0]?.signalKey, 'Core_Driver');
  assert.equal(result.body.result.signals[1]?.signalKey, 'Core_Analyst');
});

test('returns failed persisted snapshot with failure metadata and no signal leakage', async () => {
  const failedResult: AssessmentResultRow = {
    ...baseResult,
    status: 'failed',
    result_payload: {
      failure: {
        stage: 'completion_orchestration',
        category: 'runtime_error',
        code: 'RESULT_GENERATION_FAILED',
        message: 'Scoring failed',
        occurredAt: '2026-01-01T10:05:15.000Z',
        assessmentVersionKey: 'wplp80-v1',
      },
    },
    response_quality_payload: null,
  };

  const result = await getAssessmentResultReadModel('assessment-1', {
    getAssessmentById: async () => ({ ...baseAssessment, scoring_status: 'failed' }),
    getResultByAssessmentId: async () => failedResult,
    getSignalsByResultId: async () => buildSignals(),
  });

  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;

  assert.equal(result.body.result.availability, 'available');
  if (result.body.result.availability !== 'available' || result.body.result.status !== 'failed') return;

  assert.equal(result.body.result.failure?.code, 'RESULT_GENERATION_FAILED');
  assert.deepEqual(result.body.result.signals, []);
});

test('returns explicit unavailable state when no result row exists', async () => {
  const result = await getAssessmentResultReadModel('assessment-1', {
    getAssessmentById: async () => baseAssessment,
    getResultByAssessmentId: async () => null,
    getSignalsByResultId: async () => [],
  });

  assert.equal(result.kind, 'ok');
  if (result.kind !== 'ok') return;

  assert.equal(result.body.result.availability, 'unavailable');
  if (result.body.result.availability !== 'unavailable') return;

  assert.equal(result.body.result.reason, 'result_missing');
});
