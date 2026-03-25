import assert from 'node:assert/strict'
import test from 'node:test'

import { AssessmentRow } from '../lib/assessment-types'
import { DatabaseUserResolutionError } from '../lib/server/auth'
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

test('lifecycle resolution failure with fully answered attempt falls back to completed_processing instead of in_progress', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessment: async () => ({ ...inProgressAssessment, status: 'in_progress', progress_count: 80, progress_percent: '100', completed_at: null }),
    resolveLifecycle: async () => {
      throw new Error('lifecycle unavailable')
    },
  })

  assert.equal(state.authStatus, 'authenticated')
  assert.equal(state.hasCompletedResult, false)
  assert.equal(state.result, null)
  assert.equal(state.assessment.status, 'completed_processing')
  assert.equal(state.assessment.progressPercent, 100)
  assert.equal(state.assessment.questionsCompleted, 80)
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

test('dashboard prefers assignment-aware inventory lifecycle when available', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getAssessmentInventory: async () => [
      {
        id: 'signals',
        slug: 'signals',
        title: 'Signals',
        category: 'individual',
        description: 'Signals',
        longDescription: 'Signals',
        status: 'not_started',
        lifecycleState: 'not_started',
        inventorySource: 'server',
        hasAdvancedOutputs: true,
        questionCount: 80,
        estimatedMinutes: 12,
        resultsAvailable: false,
        isRetakeAllowed: false,
        measures: [],
        operationalDetails: [],
        accessRows: [],
        outputRows: [],
        productOrder: 1,
      },
    ],
    getLatestAssessment: async () => ({ ...inProgressAssessment, status: 'completed', progress_percent: '100', progress_count: 80 }),
    resolveLifecycle: async () => ({
      authState: 'authenticated',
      userId: 'user-1',
      lifecycle: {
        state: 'ready',
        latestAssessment: null,
        latestAssessmentResult: null,
        latestReadyResult: null,
        message: 'stale ready status',
      },
    }),
  })

  assert.equal(state.assessment.status, 'not_started')
  assert.equal(state.hasCompletedResult, false)
  assert.equal(state.result, null)
})

test('assignment-aware inventory keeps hybrid assigned lifecycle visible on dashboard', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => 'user-1',
    getAssessmentInventory: async () => [
      {
        id: 'signals',
        slug: 'signals',
        title: 'Signals',
        category: 'individual',
        description: 'Signals',
        longDescription: 'Signals',
        status: 'not_started',
        lifecycleState: 'not_started',
        inventorySource: 'server',
        hasAdvancedOutputs: true,
        questionCount: 80,
        estimatedMinutes: 12,
        resultsAvailable: false,
        isRetakeAllowed: false,
        measures: [],
        operationalDetails: [],
        accessRows: [],
        outputRows: [],
        productOrder: 1,
        availability: {
          definitionId: 'def-1',
          definitionKey: 'sonartra_signals',
          definitionSlug: 'signals',
          versionId: 'version-2',
          versionKey: 'hybrid-v1',
          versionName: 'Hybrid v1',
        },
      },
    ],
    getLatestAssessment: async () => null,
    resolveLifecycle: async () => ({
      authState: 'authenticated',
      userId: 'user-1',
      lifecycle: {
        state: 'ready',
        latestAssessment: null,
        latestAssessmentResult: null,
        latestReadyResult: null,
        message: 'legacy ready status',
      },
    }),
  })

  assert.equal(state.assessment.status, 'not_started')
  assert.equal(state.assessment.progressPercent, 0)
  assert.equal(state.hasCompletedResult, false)
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

test('completed_processing lifecycle is promoted to ready when a fresh fetch returns a completed result', async () => {
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
        message: 'Assessment completion marker has landed, waiting on readiness.',
      },
    }),
    getResult: async () => completeResult,
  })

  assert.equal(state.assessment.status, 'ready')
  assert.equal(state.hasCompletedResult, true)
  assert.equal(state.result?.resultStatus, 'complete')
})

test('subsequent refresh can transition dashboard CTA from processing to ready when readiness lands', async () => {
  let fetchCount = 0

  const getResult = async () => {
    fetchCount += 1
    if (fetchCount === 1) {
      throw new Error('result snapshot not visible yet')
    }

    return completeResult
  }

  const dependencies = {
    resolveAuthenticatedUserId: async () => 'user-1',
    getLatestAssessment: async () => ({ ...inProgressAssessment, status: 'completed', progress_percent: '100', progress_count: 80, completed_at: '2026-01-01T10:10:00.000Z' }),
    resolveLifecycle: async () => ({
      authState: 'authenticated' as const,
      userId: 'user-1',
      lifecycle: {
        state: 'completed_processing' as const,
        latestAssessment: null,
        latestAssessmentResult: null,
        latestReadyResult: null,
        message: 'Assessment is completed and currently processing.',
      },
    }),
    getResult,
  }

  const firstState = await getAuthenticatedDashboardState(dependencies)
  assert.equal(firstState.assessment.status, 'completed_processing')
  assert.equal(firstState.hasCompletedResult, false)
  assert.equal(firstState.result, null)

  const secondState = await getAuthenticatedDashboardState(dependencies)
  assert.equal(secondState.assessment.status, 'ready')
  assert.equal(secondState.hasCompletedResult, true)
  assert.equal(secondState.result?.resultStatus, 'complete')
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

test('database failure during authenticated user resolution falls back to a safe dashboard error state', async () => {
  const state = await getAuthenticatedDashboardState({
    resolveAuthenticatedUserId: async () => {
      throw new DatabaseUserResolutionError('Database user resolution failed.')
    },
    checkDatabaseHealth: async () => ({
      ok: false,
      reason: 'unavailable',
      message: 'Database query failed because the database connection is unavailable.',
    }),
  })

  assert.equal(state.status, 'error')
  assert.equal(state.authStatus, 'authenticated')
  assert.equal(state.hasCompletedResult, false)
  assert.equal(state.result, null)
  assert.equal(state.assessment.status, 'error')
  assert.equal(state.assessment.progressPercent, 0)
})


test('ready lifecycle preserves results-ready dashboard state when only a v2 product result exists', async () => {
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
    getResult: async () => {
      throw new Error('legacy v1 result unavailable')
    },
  })

  assert.equal(state.hasCompletedResult, true)
  assert.equal(state.assessment.status, 'ready')
  assert.equal(state.result, null)
})
