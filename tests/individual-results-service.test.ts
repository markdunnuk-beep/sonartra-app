import assert from 'node:assert/strict';
import test from 'node:test';

import { AssessmentResultRow, AssessmentResultSignalRow, AssessmentRow } from '../lib/assessment-types';
import { getLatestIndividualResultForUser } from '../lib/server/individual-results';

const baseAssessment: AssessmentRow = {
  id: 'assessment-1',
  user_id: 'user-1',
  organisation_id: null,
  assessment_version_id: 'version-1',
  status: 'completed',
  started_at: '2026-02-01T10:00:00.000Z',
  completed_at: '2026-02-01T10:12:00.000Z',
  last_activity_at: '2026-02-01T10:12:00.000Z',
  progress_count: 80,
  progress_percent: '100',
  current_question_index: 80,
  scoring_status: 'scored',
  source: 'web',
  metadata_json: null,
  created_at: '2026-02-01T10:00:00.000Z',
  updated_at: '2026-02-01T10:12:00.000Z',
};

const baseAssessmentContext = { ...baseAssessment, version_key: 'wplp80-v1', total_questions: 80 };

const completeResult: AssessmentResultRow = {
  id: 'result-1',
  assessment_id: 'assessment-1',
  assessment_version_id: 'version-1',
  version_key: 'wplp80-v1',
  scoring_model_key: 'wplp80-signal-model-v1',
  snapshot_version: 1,
  status: 'complete',
  result_payload: { scoredAt: '2026-02-01T10:12:10.000Z', layers: [] },
  response_quality_payload: null,
  completed_at: '2026-02-01T10:12:00.000Z',
  scored_at: '2026-02-01T10:12:10.000Z',
  created_at: '2026-02-01T10:12:11.000Z',
  updated_at: '2026-02-01T10:12:11.000Z',
};


const readyResultForUser = {
  ...completeResult,
  assessment_started_at: baseAssessment.started_at,
  assessment_completed_at: baseAssessment.completed_at,
  assessment_version_key: 'wplp80-v1',
};

const unsortedSignals: AssessmentResultSignalRow[] = [
  {
    id: 'sig-3',
    assessment_result_id: 'result-1',
    layer_key: 'risk',
    signal_key: 'Stress_Control',
    raw_total: '7',
    max_possible: '20',
    normalised_score: '0.35',
    relative_share: '0.5',
    rank_in_layer: 2,
    is_primary: false,
    is_secondary: true,
    percentile_placeholder: null,
    confidence_flag: null,
    created_at: '2026-02-01T10:12:11.000Z',
  },
  {
    id: 'sig-1',
    assessment_result_id: 'result-1',
    layer_key: 'behaviour_style',
    signal_key: 'Core_Driver',
    raw_total: '12',
    max_possible: '20',
    normalised_score: '0.6',
    relative_share: '0.6',
    rank_in_layer: 1,
    is_primary: true,
    is_secondary: false,
    percentile_placeholder: null,
    confidence_flag: null,
    created_at: '2026-02-01T10:12:11.000Z',
  },
  {
    id: 'sig-2',
    assessment_result_id: 'result-1',
    layer_key: 'risk',
    signal_key: 'Stress_Avoidance',
    raw_total: '9',
    max_possible: '20',
    normalised_score: '0.45',
    relative_share: '0.5',
    rank_in_layer: 1,
    is_primary: true,
    is_secondary: false,
    percentile_placeholder: null,
    confidence_flag: null,
    created_at: '2026-02-01T10:12:11.000Z',
  },
];

test('returns unauthenticated state when no user is resolved', async () => {
  const response = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => null,
  });

  assert.equal(response.ok, false);
  assert.equal(response.state, 'unauthenticated');
});

test('returns empty state when user has no assessments', async () => {
  const response = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => null,
    getLatestReadyResultForUser: async () => null,
  });

  assert.equal(response.ok, true);
  assert.equal(response.state, 'empty');
});

test('returns in-progress state when latest assessment is not completed', async () => {
  const response = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({ ...baseAssessmentContext, status: 'in_progress', completed_at: null, progress_count: 20, progress_percent: '25' }),
    getLatestReadyResultForUser: async () => null,
  });

  assert.equal(response.ok, true);
  assert.equal(response.state, 'in_progress');
});

test('returns completed-processing state when completed assessment has no successful snapshot', async () => {
  const response = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({ ...baseAssessmentContext }),
    getLatestResultForAssessment: async () => null,
    getLatestReadyResultForUser: async () => null,
  });

  assert.equal(response.ok, true);
  assert.equal(response.state, 'completed_processing');
});

test('returns error state when completed assessment latest snapshot failed and no ready fallback exists', async () => {
  const response = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({ ...baseAssessmentContext }),
    getLatestResultForAssessment: async () => ({ ...completeResult, status: 'failed' }),
    getLatestReadyResultForUser: async () => null,
    getSignalsByResultId: async () => [],
  });

  assert.equal(response.ok, false);
  assert.equal(response.state, 'error');
});

test('returns ready state with deterministic signal ordering and derived layer summaries', async () => {
  const response = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({ ...baseAssessmentContext }),
    getLatestResultForAssessment: async () => completeResult,
    getResultById: async (resultId) => {
      assert.equal(resultId, readyResultForUser.id);
      return completeResult;
    },
    getLatestReadyResultForUser: async () => readyResultForUser,
    getSignalsByResultId: async () => unsortedSignals,
  });

  assert.equal(response.ok, true);
  assert.equal(response.state, 'ready');

  if (response.state !== 'ready') {
    assert.fail('Expected ready response');
  }

  assert.deepEqual(
    response.data.signals.map((signal) => `${signal.layerKey}:${signal.signalKey}`),
    ['behaviour_style:Core_Driver', 'risk:Stress_Avoidance', 'risk:Stress_Control'],
  );
});


test('ready payload is derived from canonical ready-result selection instead of latest in-progress attempt context', async () => {
  const response = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({
      ...baseAssessmentContext,
      id: 'assessment-new',
      status: 'in_progress',
      completed_at: null,
      progress_count: 12,
      progress_percent: '15',
      version_key: 'wplp80-v2',
    }),
    getLatestReadyResultForUser: async () => ({ ...readyResultForUser, assessment_id: 'assessment-ready' }),
    getResultById: async (resultId) => {
      assert.equal(resultId, readyResultForUser.id);
      return { ...completeResult, assessment_id: 'assessment-ready', version_key: 'wplp80-v1' };
    },
    getSignalsByResultId: async () => unsortedSignals,
  });

  assert.equal(response.ok, true);
  assert.equal(response.state, 'ready');
  if (response.state === 'ready') {
    assert.equal(response.data.assessment.assessmentId, 'assessment-ready');
  }
});

test('latest ready result remains available when a newer attempt is in progress', async () => {
  const response = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({
      ...baseAssessmentContext,
      id: 'assessment-2',
      status: 'in_progress',
      completed_at: null,
      progress_count: 8,
      progress_percent: '10',
      version_key: 'wplp80-v2',
    }),
    getResultById: async () => completeResult,
    getLatestReadyResultForUser: async () => readyResultForUser,
    getSignalsByResultId: async () => unsortedSignals,
  });

  assert.equal(response.ok, true);
  assert.equal(response.state, 'ready');
  if (response.state === 'ready') {
    assert.equal(response.data.assessment.assessmentId, 'assessment-1');
  }
});

test('returns completed-processing state when ready snapshot metadata exists but signals have not landed yet', async () => {
  const response = await getLatestIndividualResultForUser({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({ ...baseAssessmentContext }),
    getLatestResultForAssessment: async () => completeResult,
    getResultById: async () => completeResult,
    getLatestReadyResultForUser: async () => readyResultForUser,
    getSignalsByResultId: async () => [],
  });

  assert.equal(response.ok, true);
  assert.equal(response.state, 'completed_processing');
});
