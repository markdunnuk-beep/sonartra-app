import assert from 'node:assert/strict'
import test from 'node:test'

import { AssessmentRow } from '../lib/assessment-types'
import { getAuthenticatedDashboardState } from '../lib/server/dashboard-state'
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

test('in-progress lifecycle keeps dashboard in progress mode', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessment: async () => inProgressAssessment,
    resolveLifecycle: async () => ({
      authState: 'authenticated',
      userId: 'user-1',
      lifecycle: {
        state: 'in_progress',
        latestAssessment: null,
        latestAssessmentResult: null,
        latestReadyResult: null,
        message: 'Latest assessment is not completed yet.',
      },
    }),
    getResult: async () => completeResult,
  })

  assert.equal(state.hasCompletedResult, false)
  assert.equal(state.result, null)
  assert.equal(state.assessment.status, 'in_progress')
  assert.equal(state.assessment.progressPercent, 30)
  assert.equal(state.assessment.questionsCompleted, 24)
})

test('ready lifecycle allows dashboard intelligence rendering only with persisted complete result', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessment: async () => ({ ...inProgressAssessment, status: 'completed', progress_percent: '100', progress_count: 80, completed_at: '2026-01-01T10:10:00.000Z' }),
    resolveLifecycle: async () => ({
      authState: 'authenticated',
      userId: 'user-1',
      lifecycle: {
        state: 'ready',
        latestAssessment: null,
        latestAssessmentResult: null,
        latestReadyResult: null,
        message: 'ready',
      },
    }),
    getResult: async () => completeResult,
  })

  assert.equal(state.hasCompletedResult, true)
  assert.equal(state.result?.resultStatus, 'complete')
  assert.equal(state.assessment.status, 'ready')
})

test('lifecycle resolution failure preserves real assessment metrics instead of resetting to not_started defaults', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessment: async () => inProgressAssessment,
    resolveLifecycle: async () => {
      throw new Error('lifecycle unavailable')
    },
  })

  assert.equal(state.authStatus, 'authenticated')
  assert.equal(state.hasCompletedResult, false)
  assert.equal(state.result, null)
  assert.equal(state.assessment.status, 'in_progress')
  assert.equal(state.assessment.progressPercent, 30)
  assert.equal(state.assessment.questionsCompleted, 24)
})

test('no assessment still resolves to true not_started defaults', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessment: async () => null,
    resolveLifecycle: async () => ({
      authState: 'authenticated',
      userId: 'user-1',
      lifecycle: {
        state: 'not_started',
        latestAssessment: null,
        latestAssessmentResult: null,
        latestReadyResult: null,
        message: 'No assessment found for this user.',
      },
    }),
  })

  assert.equal(state.assessment.status, 'not_started')
  assert.equal(state.assessment.progressPercent, 0)
  assert.equal(state.assessment.questionsCompleted, 0)
})

test('completed_processing lifecycle keeps real completion metrics while result remains unavailable', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessment: async () => ({ ...inProgressAssessment, status: 'completed', progress_percent: '100', progress_count: 80, completed_at: '2026-01-01T10:10:00.000Z' }),
    resolveLifecycle: async () => ({
      authState: 'authenticated',
      userId: 'user-1',
      lifecycle: {
        state: 'completed_processing',
        latestAssessment: null,
        latestAssessmentResult: null,
        latestReadyResult: null,
        message: 'Assessment is completed but persisted result is not available yet.',
      },
    }),
  })

  assert.equal(state.assessment.status, 'completed_processing')
  assert.equal(state.assessment.progressPercent, 100)
  assert.equal(state.assessment.questionsCompleted, 80)
})


test('latest ready result with newer in-progress attempt keeps real progress metrics while preserving ready availability', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessment: async () => ({ ...inProgressAssessment, progress_count: 12, progress_percent: '15' }),
    resolveLifecycle: async () => ({
      authState: 'authenticated',
      userId: 'user-1',
      lifecycle: {
        state: 'ready',
        latestAssessment: null,
        latestAssessmentResult: null,
        latestReadyResult: null,
        message: 'A newer attempt is in progress, but a prior ready result is available.',
      },
    }),
    getResult: async () => completeResult,
  })

  assert.equal(state.hasCompletedResult, true)
  assert.equal(state.assessment.status, 'ready')
  assert.equal(state.assessment.progressPercent, 15)
  assert.equal(state.assessment.questionsCompleted, 12)
})
