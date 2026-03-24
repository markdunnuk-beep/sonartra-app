import assert from 'node:assert/strict'
import test from 'node:test'

import { loadLiveAssessmentRepositoryInventory } from '../lib/server/assessment-repository-inventory'
import type { AssessmentResultRow, AssessmentRow } from '../lib/assessment-types'

const baseAssessment: AssessmentRow = {
  id: 'assessment-1',
  user_id: 'user-1',
  organisation_id: null,
  assessment_version_id: 'version-1',
  status: 'in_progress',
  started_at: '2026-03-20T09:00:00.000Z',
  completed_at: null,
  last_activity_at: '2026-03-20T09:10:00.000Z',
  progress_count: 10,
  progress_percent: '40',
  current_question_index: 9,
  scoring_status: 'not_scored',
  source: 'workspace',
  metadata_json: null,
  created_at: '2026-03-20T09:00:00.000Z',
  updated_at: '2026-03-20T09:10:00.000Z',
}

const baseResult: AssessmentResultRow = {
  id: 'result-1',
  assessment_id: 'assessment-1',
  assessment_version_id: 'version-1',
  version_key: 'v1',
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

function makeAssignment(overrides: Partial<{
  status: 'assigned' | 'in_progress' | 'completed_processing' | 'results_ready' | 'failed' | 'cancelled'
  definitionId: string
  definitionKey: string
  definitionSlug: string
  definitionName: string
  versionId: string
  versionKey: string
  versionName: string
  totalQuestions: number
  assignedAt: string
}> = {}) {
  return {
    id: 'assignment-1',
    status: overrides.status ?? 'assigned',
    assessment_definition_id: overrides.definitionId ?? 'definition-signals',
    assessment_definition_key: overrides.definitionKey ?? 'sonartra_signals',
    assessment_definition_slug: overrides.definitionSlug ?? 'sonartra-signals',
    assessment_definition_name: overrides.definitionName ?? 'Sonartra Signals',
    assessment_definition_description: 'Test description',
    assessment_definition_category: 'behavioural_intelligence',
    current_published_version_id: overrides.versionId ?? 'version-1',
    assessment_version_id: overrides.versionId ?? 'version-1',
    assessment_version_key: overrides.versionKey ?? 'v1',
    assessment_version_name: overrides.versionName ?? 'Signals v1',
    total_questions: overrides.totalQuestions ?? 80,
    package_schema_version: null,
    is_active: true,
    assigned_at: overrides.assignedAt ?? '2026-03-20T08:55:00.000Z',
  }
}

function makeQueryDb(options: {
  assignments?: ReturnType<typeof makeAssignment>[]
  latestAssessmentByDefinition?: Record<string, ({ total_questions: number | null } & AssessmentRow) | null>
  latestResultByAssessmentId?: Record<string, AssessmentResultRow | null>
  latestReadyResultByDefinition?: Record<string, ({ assessment_started_at: string | null; assessment_completed_at: string | null } & AssessmentResultRow) | null>
  signalCountByResultId?: Record<string, number>
}) {
  return async (sql: string, params?: unknown[]) => {
    if (/from assessment_repository_assignments/i.test(sql)) {
      return { rows: options.assignments ?? [] } as never
    }

    if (/from assessments a/i.test(sql)) {
      const definitionId = String(params?.[1] ?? '')
      const row = options.latestAssessmentByDefinition?.[definitionId] ?? null
      return { rows: row ? [row] : [] } as never
    }

    if (/from assessment_results\s+where assessment_id = \$1/i.test(sql)) {
      const assessmentId = String(params?.[0] ?? '')
      const row = options.latestResultByAssessmentId?.[assessmentId] ?? null
      return { rows: row ? [row] : [] } as never
    }

    if (/from assessment_results ar/i.test(sql)) {
      const definitionId = String(params?.[1] ?? '')
      const row = options.latestReadyResultByDefinition?.[definitionId] ?? null
      return { rows: row ? [row] : [] } as never
    }

    if (/from assessment_result_signals/i.test(sql)) {
      const resultId = String(params?.[0] ?? '')
      return { rows: [{ signal_count: String(options.signalCountByResultId?.[resultId] ?? 0) }] } as never
    }

    throw new Error(`Unhandled SQL in test double: ${sql}`)
  }
}

test('published + assigned + no attempt appears as launchable in repository inventory', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    queryDb: makeQueryDb({
      assignments: [makeAssignment()],
    }),
  })

  assert.equal(inventory.length, 1)
  assert.equal(inventory[0]?.status, 'not_started')
  assert.equal(inventory[0]?.lifecycleState, 'not_started')
  assert.match(inventory[0]?.assessmentHref ?? '', /\/assessment\/workspace\?definitionId=definition-signals/)
})

test('published + assigned + in-progress attempt appears as in progress', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    queryDb: makeQueryDb({
      assignments: [makeAssignment({ status: 'in_progress' })],
      latestAssessmentByDefinition: {
        'definition-signals': {
          ...baseAssessment,
          total_questions: 80,
        },
      },
    }),
  })

  assert.equal(inventory[0]?.status, 'in_progress')
  assert.equal(inventory[0]?.lifecycleState, 'in_progress')
  assert.equal(inventory[0]?.latestAttemptId, 'assessment-1')
})

test('published + assigned + completed hybrid result appears as results ready', async () => {
  const completedAssessment = {
    ...baseAssessment,
    status: 'completed' as const,
    progress_count: 80,
    progress_percent: '100',
    completed_at: '2026-03-20T09:15:00.000Z',
    total_questions: 80,
  }

  const hybridReadyResult: AssessmentResultRow = {
    ...baseResult,
    status: 'complete',
    result_payload: {
      contractVersion: 'hybrid_mvp_v1',
      report: {
        summary: { id: 'summary-1', headline: 'Ready', text: 'Hybrid output ready' },
        sections: [
          {
            id: 'overview',
            title: 'Overview',
            blocks: [
              { id: 'block-1', kind: 'narrative', title: 'Intro', body: 'Summary body' },
            ],
          },
        ],
      },
      rankedSignals: [
        {
          signalId: 'signal-1',
          signalKey: 'adaptability',
          rawScore: 10,
          normalizedScore: 0.8,
          rank: 1,
        },
      ],
    },
  }

  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    queryDb: makeQueryDb({
      assignments: [makeAssignment({ status: 'results_ready' })],
      latestAssessmentByDefinition: {
        'definition-signals': completedAssessment,
      },
      latestResultByAssessmentId: {
        'assessment-1': hybridReadyResult,
      },
      latestReadyResultByDefinition: {
        'definition-signals': {
          ...hybridReadyResult,
          assessment_started_at: '2026-03-20T09:00:00.000Z',
          assessment_completed_at: '2026-03-20T09:15:00.000Z',
        },
      },
    }),
  })

  assert.equal(inventory[0]?.status, 'complete')
  assert.equal(inventory[0]?.lifecycleState, 'ready')
  assert.equal(inventory[0]?.resultsAvailable, true)
})

test('unassigned published assessment stays hidden when repository is assignment-gated', async () => {
  const inventory = await loadLiveAssessmentRepositoryInventory('user-1', {
    queryDb: makeQueryDb({
      assignments: [],
    }),
  })

  assert.deepEqual(inventory, [])
})
