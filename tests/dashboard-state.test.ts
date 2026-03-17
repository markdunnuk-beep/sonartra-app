import assert from 'node:assert/strict'
import test from 'node:test'

import { AssessmentRow } from '../lib/assessment-types'
import { getAuthenticatedDashboardState, selectDashboardAssessment } from '../lib/server/dashboard-state'
import { IndividualIntelligenceResultContract } from '../lib/server/individual-intelligence-result'

const inProgressAssessment: AssessmentRow = {
  id: 'assessment-1',
  user_id: 'user-1',
  organisation_id: null,
  assessment_version_id: 'version-1',
  status: 'in_progress',
  started_at: '2026-01-01T10:00:00.000Z',
  completed_at: null,
  last_activity_at: '2026-01-01T10:05:00.000Z',
  progress_count: 24,
  progress_percent: '30',
  current_question_index: 24,
  scoring_status: 'pending',
  source: 'web',
  metadata_json: null,
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-01T10:05:00.000Z',
}

const completeResult: IndividualIntelligenceResultContract = {
  hasResult: true,
  resultStatus: 'complete',
  assessmentId: 'assessment-1',
  completedAt: '2026-01-01T10:10:00.000Z',
  versionKey: 'wplp80-v1',
  summary: {
    assessmentResultId: 'result-1',
    scoringModelKey: 'wplp80-signal-model-v1',
    snapshotVersion: 1,
    scoredAt: '2026-01-01T10:11:00.000Z',
    createdAt: '2026-01-01T10:11:00.000Z',
    updatedAt: '2026-01-01T10:11:00.000Z',
  },
  layerSummaries: [{ layerKey: 'behaviour_style', totalRawValue: 10, topSignalKey: 'Core_Driver', signalCount: 2 }],
  signalSummaries: [],
  responseQuality: null,
  emptyState: null,
  failedState: null,
}

test('no completed result keeps dashboard in progress mode and aligned with navigation gate', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    hasCompletedResult: async () => false,
    getLatestAssessment: async () => inProgressAssessment,
    getResult: async () => completeResult,
  })

  assert.equal(state.hasCompletedResult, false)
  assert.equal(state.result, null)
  assert.equal(state.assessment.status, 'in_progress')
  assert.equal(state.assessment.progressPercent, 30)
  assert.equal(state.assessment.questionsCompleted, 24)
  assert.equal(state.assessment.questionsRemaining, 56)
})

test('completed-result gate allows dashboard intelligence rendering only with persisted complete result', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    hasCompletedResult: async () => true,
    getLatestAssessment: async () => ({ ...inProgressAssessment, status: 'completed', progress_percent: '100', progress_count: 80 }),
    getResult: async () => completeResult,
  })

  assert.equal(state.hasCompletedResult, true)
  assert.equal(state.result?.resultStatus, 'complete')
})

test('failed or missing persisted result stays gated even when nav check reports completion', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    hasCompletedResult: async () => true,
    getLatestAssessment: async () => ({ ...inProgressAssessment, status: 'completed', progress_percent: '100', progress_count: 80 }),
    getResult: async () => ({ ...completeResult, hasResult: false, resultStatus: 'failed', failedState: { reason: 'result_generation_failed', message: 'Failed', failure: null } }),
  })

  assert.equal(state.hasCompletedResult, false)
  assert.equal(state.result, null)
})


test('falls back to safe authenticated pre-results state when dashboard data resolution throws', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessment: async () => {
      throw new Error('db unavailable')
    },
  })

  assert.equal(state.authStatus, 'authenticated')
  assert.equal(state.hasCompletedResult, false)
  assert.equal(state.result, null)
  assert.equal(state.assessment.status, 'not_started')
  assert.equal(state.assessment.progressPercent, 0)
})


test('selectDashboardAssessment prioritises active in-progress attempt over newer completed attempts', () => {
  const completed = { ...inProgressAssessment, id: 'assessment-complete', status: 'completed', progress_count: 80, progress_percent: '100' } as AssessmentRow
  const active = { ...inProgressAssessment, id: 'assessment-active', status: 'in_progress', progress_count: 12, progress_percent: '15' } as AssessmentRow

  const selected = selectDashboardAssessment([completed, active])

  assert.equal(selected?.id, 'assessment-active')
})
