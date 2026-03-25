import assert from 'node:assert/strict'
import test from 'node:test'

import type { AssessmentResultSignalRow } from '../lib/assessment-types'
import { loadIndividualResultDetailById } from '../lib/server/individual-result-detail'

const baseSnapshot = {
  id: 'result-behavioural',
  assessment_id: 'assessment-1',
  assessment_version_id: 'version-1',
  version_key: 'v1',
  scoring_model_key: 'model-v1',
  snapshot_version: 1,
  status: 'complete' as const,
  result_payload: { summary: 'ok' },
  response_quality_payload: null,
  completed_at: '2026-03-20T09:10:00.000Z',
  scored_at: '2026-03-20T09:10:10.000Z',
  created_at: '2026-03-20T09:10:10.000Z',
  updated_at: '2026-03-20T09:10:10.000Z',
  assessment_started_at: '2026-03-20T09:00:00.000Z',
  assessment_completed_at: '2026-03-20T09:10:00.000Z',
  assessment_version_key: 'v1',
}

const sampleSignals: AssessmentResultSignalRow[] = [
  {
    id: 'signal-1',
    assessment_result_id: 'result-behavioural',
    layer_key: 'behaviour_style',
    signal_key: 'Core_Driver',
    raw_total: '10',
    max_possible: '20',
    normalised_score: '0.5',
    relative_share: '1',
    rank_in_layer: 1,
    is_primary: true,
    is_secondary: false,
    percentile_placeholder: null,
    confidence_flag: null,
    created_at: '2026-03-20T09:10:11.000Z',
  },
]

test('direct detail access resolves behavioural_intelligence category results', async () => {
  const sqlStatements: string[] = []
  const response = await loadIndividualResultDetailById('result-behavioural', {
    resolveAuthenticatedAppUser: async () => ({
      clerkUserId: 'clerk-1',
      dbUserId: 'user-1',
      email: 'user@example.com',
    }),
    queryDb: async (sql: string, params?: unknown[]) => {
      sqlStatements.push(sql)

      if (sql.includes('FROM assessment_results ar')) {
        assert.equal(params?.[0], 'result-behavioural')
        return { rows: [baseSnapshot] } as never
      }

      if (sql.includes('FROM assessment_result_signals')) {
        return { rows: sampleSignals } as never
      }

      return { rows: [] } as never
    },
  })

  assert.equal(response.ok, true)
  assert.equal(response.state, 'ready')
  assert.ok(sqlStatements.some((sql) => /LOWER\(BTRIM\(ad\.category\)\) IN \('individual', 'behavioural_intelligence'\)/i.test(sql)))
})

test('direct detail access blocks results from non-individual categories', async () => {
  const response = await loadIndividualResultDetailById('result-team', {
    resolveAuthenticatedAppUser: async () => ({
      clerkUserId: 'clerk-1',
      dbUserId: 'user-1',
      email: 'user@example.com',
    }),
    queryDb: async (sql: string) => {
      if (sql.includes('FROM assessment_results ar')) {
        return { rows: [] } as never
      }

      return { rows: sampleSignals } as never
    },
  })

  assert.equal(response.ok, false)
  assert.equal(response.state, 'error')
  assert.equal(response.message, 'Result not found for this user.')
})
