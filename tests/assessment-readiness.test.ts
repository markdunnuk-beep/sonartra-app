import assert from 'node:assert/strict'
import test from 'node:test'

import { AssessmentResultRow, AssessmentRow } from '../lib/assessment-types'
import { resolveIndividualLifecycleState } from '../lib/server/assessment-readiness'

const completedAssessment: AssessmentRow & { version_key: string | null; total_questions: number | null } = {
  id: 'assessment-1',
  user_id: 'user-1',
  organisation_id: null,
  assessment_version_id: 'version-1',
  status: 'completed',
  started_at: '2026-01-01T10:00:00.000Z',
  completed_at: '2026-01-01T10:10:00.000Z',
  last_activity_at: '2026-01-01T10:10:00.000Z',
  progress_count: 80,
  progress_percent: '100',
  current_question_index: 80,
  scoring_status: 'scored',
  source: 'web',
  metadata_json: null,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:10:00.000Z',
  version_key: 'wplp80-v1',
  total_questions: 80,
}

const completeSnapshot: AssessmentResultRow = {
  id: 'result-1',
  assessment_id: 'assessment-1',
  assessment_version_id: 'version-1',
  version_key: 'wplp80-v1',
  scoring_model_key: 'wplp80-signal-model-v1',
  snapshot_version: 1,
  status: 'complete',
  result_payload: {},
  response_quality_payload: null,
  completed_at: '2026-01-01T10:10:00.000Z',
  scored_at: '2026-01-01T10:11:00.000Z',
  created_at: '2026-01-01T10:11:00.000Z',
  updated_at: '2026-01-01T10:11:00.000Z',
}

test('no assessment resolves not_started', async () => {
  const state = await resolveIndividualLifecycleState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => null,
    getLatestReadyResultForUser: async () => null,
  })

  assert.equal(state.authState, 'authenticated')
  if (state.authState === 'authenticated') assert.equal(state.lifecycle.state, 'not_started')
})

test('partial assessment resolves in_progress', async () => {
  const state = await resolveIndividualLifecycleState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({ ...completedAssessment, status: 'in_progress', completed_at: null, progress_percent: '80', progress_count: 64 }),
    getLatestReadyResultForUser: async () => null,
  })

  if (state.authState === 'authenticated') assert.equal(state.lifecycle.state, 'in_progress')
})

test('completed with no snapshot resolves completed_processing', async () => {
  const state = await resolveIndividualLifecycleState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => completedAssessment,
    getLatestResultForAssessment: async () => null,
    getLatestReadyResultForUser: async () => null,
  })

  if (state.authState === 'authenticated') assert.equal(state.lifecycle.state, 'completed_processing')
})

test('completed with successful snapshot and signals resolves ready', async () => {
  const state = await resolveIndividualLifecycleState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => completedAssessment,
    getLatestResultForAssessment: async () => completeSnapshot,
    getSignalCountByResultId: async () => 3,
    getLatestReadyResultForUser: async () => ({
      ...completeSnapshot,
      assessment_started_at: completedAssessment.started_at,
      assessment_completed_at: completedAssessment.completed_at,
      assessment_version_key: completedAssessment.version_key,
    }),
  })

  if (state.authState === 'authenticated') assert.equal(state.lifecycle.state, 'ready')
})

test('completed with failed snapshot resolves error when no prior ready result exists', async () => {
  const state = await resolveIndividualLifecycleState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => completedAssessment,
    getLatestResultForAssessment: async () => ({ ...completeSnapshot, status: 'failed' }),
    getSignalCountByResultId: async () => 0,
    getLatestReadyResultForUser: async () => null,
  })

  if (state.authState === 'authenticated') assert.equal(state.lifecycle.state, 'error')
})

test('latest in-progress attempt still resolves ready when older ready result exists', async () => {
  const state = await resolveIndividualLifecycleState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessmentForUser: async () => ({ ...completedAssessment, id: 'assessment-2', status: 'in_progress', completed_at: null, progress_percent: '10', progress_count: 8 }),
    getLatestReadyResultForUser: async () => ({
      ...completeSnapshot,
      assessment_started_at: completedAssessment.started_at,
      assessment_completed_at: completedAssessment.completed_at,
      assessment_version_key: completedAssessment.version_key,
    }),
    getSignalCountByResultId: async () => 3,
  })

  if (state.authState === 'authenticated') {
    assert.equal(state.lifecycle.state, 'ready')
    assert.equal(state.lifecycle.latestReadyResult?.assessmentId, 'assessment-1')
  }
})
