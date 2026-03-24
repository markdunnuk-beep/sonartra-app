import assert from 'node:assert/strict'
import test from 'node:test'

import { loadLiveAssessmentRepositoryInventory } from '../lib/server/assessment-repository-inventory'
import type { AssessmentResultRow, AssessmentRow } from '../lib/assessment-types'

const publishedVersion = {
  assessmentDefinitionId: 'definition-signals',
  assessmentDefinitionKey: 'sonartra_signals',
  assessmentDefinitionSlug: 'sonartra-signals',
  currentPublishedVersionId: 'version-live',
  assessmentVersionId: 'version-live',
  assessmentVersionKey: 'signals-v2',
  assessmentVersionName: 'Sonartra Signals v2',
  totalQuestions: 80,
  isActive: true,
}

const baseAssessment: AssessmentRow = {
  id: 'assessment-1',
  user_id: 'user-1',
  organisation_id: null,
  assessment_version_id: 'version-live',
  status: 'in_progress',
  started_at: '2026-03-20T09:00:00.000Z',
  completed_at: null,
  last_activity_at: '2026-03-20T09:10:00.000Z',
  progress_count: 32,
  progress_percent: '40',
  current_question_index: 31,
  scoring_status: 'not_scored',
  source: 'workspace',
  metadata_json: null,
  created_at: '2026-03-20T09:00:00.000Z',
  updated_at: '2026-03-20T09:10:00.000Z',
}

const baseResult: AssessmentResultRow = {
  id: 'result-1',
  assessment_id: 'assessment-1',
  assessment_version_id: 'version-live',
  version_key: 'signals-v2',
  scoring_model_key: 'signals-model-v1',
  snapshot_version: 1,
  status: 'pending',
  result_payload: null,
  response_quality_payload: null,
  completed_at: '2026-03-20T09:15:00.000Z',
  scored_at: null,
  created_at: '2026-03-20T09:16:00.000Z',
  updated_at: '2026-03-20T09:16:00.000Z',
}

function makeQueryDb(options: {
  latestAssessment?: ({ version_key: string | null; version_name: string | null; total_questions: number | null } & AssessmentRow) | null
  latestResult?: AssessmentResultRow | null
  latestReadyResult?: ({ assessment_started_at: string | null; assessment_completed_at: string | null } & AssessmentResultRow) | null
  latestAssignment?: {
    id: string
    status: 'assigned' | 'in_progress' | 'completed_processing' | 'results_ready' | 'failed' | 'cancelled'
    assessment_definition_id: string
    assessment_definition_key: string
    assessment_definition_slug: string
    assessment_version_id: string
    assessment_version_key: string
    assessment_version_name: string
    total_questions: number
    is_active: boolean
    assessment_id: string | null
    latest_result_id: string | null
    assigned_at: string
  } | null
  signalCount?: number
}) {
  return async (sql: string) => {
    if (/from assessments a/i.test(sql)) {
      return { rows: options.latestAssessment ? [options.latestAssessment] : [] } as never
    }

    if (/from assessment_results\s+where assessment_id = \$1/i.test(sql)) {
      return { rows: options.latestResult ? [options.latestResult] : [] } as never
    }

    if (/from assessment_results ar/i.test(sql)) {
      return { rows: options.latestReadyResult ? [options.latestReadyResult] : [] } as never
    }

    if (/from assessment_repository_assignments/i.test(sql)) {
      return { rows: options.latestAssignment ? [options.latestAssignment] : [] } as never
    }

    if (/from assessment_result_signals/i.test(sql)) {
      return { rows: [{ signal_count: String(options.signalCount ?? 0) }] } as never
    }

    throw new Error(`Unhandled SQL in test double: ${sql}`)
  }
}

test('hides inventory when no published live Signals version is available', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: null,
      diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
    }),
    queryDb: makeQueryDb({}),
  })

  assert.deepEqual(inventory, [])
})

test('hides inventory when the published Signals version has not been materialized into the live runtime', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: null,
      diagnostic: {
        code: 'runtime_not_materialized',
        message: 'The published Sonartra Signals version is not runnable yet because runtime materialization has not completed.',
      },
    }),
    queryDb: makeQueryDb({}),
  })

  assert.deepEqual(inventory, [])
})

test('returns assigned lifecycle inventory when a published assignment exists but the current live runtime is unavailable', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: null,
      diagnostic: {
        code: 'runtime_not_materialized',
        message: 'The published Sonartra Signals version is not runnable yet because runtime materialization has not completed.',
      },
    }),
    queryDb: makeQueryDb({
      latestAssignment: {
        id: 'assignment-1',
        status: 'assigned',
        assessment_definition_id: 'definition-signals',
        assessment_definition_key: 'sonartra_signals',
        assessment_definition_slug: 'sonartra-signals',
        assessment_version_id: 'version-assigned',
        assessment_version_key: 'signals-hybrid-v1',
        assessment_version_name: 'Assigned Signals Hybrid v1',
        total_questions: 64,
        is_active: true,
        assessment_id: null,
        latest_result_id: null,
        assigned_at: '2026-03-20T08:55:00.000Z',
      },
    }),
  })

  assert.equal(inventory.length, 1)
  assert.equal(inventory[0]?.status, 'not_started')
  assert.equal(inventory[0]?.lifecycleState, 'not_started')
  assert.equal(inventory[0]?.availability?.versionId, 'version-assigned')
  assert.equal(inventory[0]?.availability?.versionKey, 'signals-hybrid-v1')
  assert.equal(inventory[0]?.questionCount, 64)
  assert.equal(inventory[0]?.assessmentHref, '/assessment/workspace')
})

test('returns a startable Signals inventory item when a published live version exists and the user has not started', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: publishedVersion,
      diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
    }),
    queryDb: makeQueryDb({}),
  })

  assert.equal(inventory.length, 1)
  assert.equal(inventory[0]?.id, 'signals')
  assert.equal(inventory[0]?.status, 'not_started')
  assert.equal(inventory[0]?.lifecycleState, 'not_started')
  assert.equal(inventory[0]?.assessmentHref, '/assessment/workspace')
  assert.equal(inventory[0]?.resultsHref, undefined)
  assert.equal(inventory[0]?.availability?.versionKey, 'signals-v2')
  assert.equal(inventory[0]?.inventorySource, 'server')
})

test('returns in-progress lifecycle metadata from the latest live Signals attempt', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: publishedVersion,
      diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
    }),
    queryDb: makeQueryDb({
      latestAssessment: {
        ...baseAssessment,
        version_key: 'signals-v2',
        version_name: 'Sonartra Signals v2',
        total_questions: 80,
      },
    }),
  })

  assert.equal(inventory[0]?.status, 'in_progress')
  assert.equal(inventory[0]?.lifecycleState, 'in_progress')
  assert.equal(inventory[0]?.progressPercent, 40)
  assert.equal(inventory[0]?.latestAttemptId, 'assessment-1')
  assert.equal(inventory[0]?.latestResultId, null)
  assert.equal(inventory[0]?.assessmentHref, '/assessment/workspace')
  assert.match(inventory[0]?.statusNote ?? '', /latest Signals attempt is active/i)
})

test('returns processing lifecycle when the latest completed attempt has no ready result yet', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: publishedVersion,
      diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
    }),
    queryDb: makeQueryDb({
      latestAssessment: {
        ...baseAssessment,
        status: 'completed',
        progress_count: 80,
        progress_percent: '100',
        completed_at: '2026-03-20T09:15:00.000Z',
        version_key: 'signals-v2',
        version_name: 'Sonartra Signals v2',
        total_questions: 80,
      },
      latestResult: { ...baseResult, status: 'pending' },
      signalCount: 0,
    }),
  })

  assert.equal(inventory[0]?.status, 'processing')
  assert.equal(inventory[0]?.lifecycleState, 'completed_processing')
  assert.equal(inventory[0]?.resultsHref, undefined)
  assert.equal(inventory[0]?.latestResultStatus, 'pending')
  assert.match(inventory[0]?.statusNote ?? '', /still processing/i)
})

test('returns ready lifecycle when the latest completed attempt has a successful scored result', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: publishedVersion,
      diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
    }),
    queryDb: makeQueryDb({
      latestAssessment: {
        ...baseAssessment,
        status: 'completed',
        progress_count: 80,
        progress_percent: '100',
        completed_at: '2026-03-20T09:15:00.000Z',
        version_key: 'signals-v2',
        version_name: 'Sonartra Signals v2',
        total_questions: 80,
      },
      latestResult: { ...baseResult, status: 'complete' },
      latestReadyResult: {
        ...baseResult,
        status: 'complete',
        assessment_started_at: '2026-03-20T09:00:00.000Z',
        assessment_completed_at: '2026-03-20T09:15:00.000Z',
      },
      signalCount: 24,
    }),
  })

  assert.equal(inventory[0]?.status, 'complete')
  assert.equal(inventory[0]?.lifecycleState, 'ready')
  assert.equal(inventory[0]?.resultsAvailable, true)
  assert.equal(inventory[0]?.resultsHref, '/results/individual')
  assert.equal(inventory[0]?.latestResultId, 'result-1')
  assert.equal(inventory[0]?.latestResultStatus, 'complete')
})

test('returns error lifecycle when the latest completed attempt failed result generation', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: publishedVersion,
      diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
    }),
    queryDb: makeQueryDb({
      latestAssessment: {
        ...baseAssessment,
        status: 'completed',
        progress_count: 80,
        progress_percent: '100',
        completed_at: '2026-03-20T09:15:00.000Z',
        version_key: 'signals-v2',
        version_name: 'Sonartra Signals v2',
        total_questions: 80,
      },
      latestResult: { ...baseResult, status: 'failed' },
      signalCount: 0,
    }),
  })

  assert.equal(inventory[0]?.status, 'error')
  assert.equal(inventory[0]?.lifecycleState, 'error')
  assert.equal(inventory[0]?.resultsAvailable, false)
  assert.equal(inventory[0]?.assessmentHref, undefined)
  assert.equal(inventory[0]?.latestResultStatus, 'failed')
})


test('returns ready lifecycle for completed v2 results even when signal rows are not persisted', async () => {
  const v2Result: AssessmentResultRow = {
    ...baseResult,
    status: 'complete',
    result_payload: {
      contractVersion: 'package_contract_v2',
      packageMetadata: { assessmentName: 'Adaptive Balance' },
      materializedOutputs: {
        webSummaryOutputs: [
          {
            id: 'summary:1',
            key: 'adaptive-balance',
            title: 'Adaptive Balance',
            label: 'Adaptive Balance',
            status: 'available',
            severity: null,
            band: 'Balanced',
            value: { score: 74, rawScore: 12, percentile: 81, descriptor: 'Strongly balanced' },
            explanation: { text: 'Consistent balance across adaptive dimensions.' },
            visibleInProduct: true,
          },
        ],
        integrityNotices: [],
      },
    },
  }

  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: publishedVersion,
      diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
    }),
    queryDb: makeQueryDb({
      latestAssessment: {
        ...baseAssessment,
        status: 'completed',
        progress_count: 80,
        progress_percent: '100',
        completed_at: '2026-03-20T09:15:00.000Z',
        version_key: 'signals-v2',
        version_name: 'Sonartra Signals v2',
        total_questions: 80,
      },
      latestResult: v2Result,
      latestReadyResult: {
        ...v2Result,
        assessment_started_at: '2026-03-20T09:00:00.000Z',
        assessment_completed_at: '2026-03-20T09:15:00.000Z',
      },
      signalCount: 0,
    }),
  })

  assert.equal(inventory[0]?.status, 'complete')
  assert.equal(inventory[0]?.lifecycleState, 'ready')
  assert.equal(inventory[0]?.resultsAvailable, true)
})

test('returns ready lifecycle for hybrid_mvp_v1 results even when signal rows are not persisted', async () => {
  const hybridResult: AssessmentResultRow = {
    ...baseResult,
    status: 'complete',
    result_payload: {
      contractVersion: 'hybrid_mvp_v1',
      rankedSignals: [
        { signalId: 'signal-1', signalKey: 'Drive', domainId: 'execution', rawScore: 12, normalizedScore: 0.66, rank: 1 },
      ],
      report: {
        summary: { id: 'summary-1', headline: 'Execution profile', text: 'Strong execution profile.' },
        sections: [
          {
            id: 'strengths',
            title: 'Strengths',
            blocks: [{ id: 's1', kind: 'signal', title: 'Drive', body: 'Strong momentum.' }],
          },
        ],
      },
    },
  }

  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    resolveLiveSignalsPublishedVersionState: async () => ({
      version: publishedVersion,
      diagnostic: { code: 'no_published_version', message: 'No active published Sonartra Signals version is available.' },
    }),
    queryDb: makeQueryDb({
      latestAssessment: {
        ...baseAssessment,
        status: 'completed',
        progress_count: 80,
        progress_percent: '100',
        completed_at: '2026-03-20T09:15:00.000Z',
        version_key: 'signals-v2',
        version_name: 'Sonartra Signals v2',
        total_questions: 80,
      },
      latestResult: hybridResult,
      latestReadyResult: {
        ...hybridResult,
        assessment_started_at: '2026-03-20T09:00:00.000Z',
        assessment_completed_at: '2026-03-20T09:15:00.000Z',
      },
      signalCount: 0,
    }),
  })

  assert.equal(inventory[0]?.status, 'complete')
  assert.equal(inventory[0]?.lifecycleState, 'ready')
  assert.equal(inventory[0]?.resultsAvailable, true)
})
