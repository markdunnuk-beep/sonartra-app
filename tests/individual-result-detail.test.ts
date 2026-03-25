import assert from 'node:assert/strict'
import test from 'node:test'

import { loadIndividualResultDetailById } from '../lib/server/individual-result-detail'

test('detail loader resolves behavioural_intelligence-linked results', async () => {
  const sqlStatements: string[] = []
  const response = await loadIndividualResultDetailById('result-1', {
    resolveAuthenticatedAppUser: async () => ({
      id: 'app-user-1',
      dbUserId: 'user-1',
      authUserId: 'auth-1',
      email: 'test@example.com',
      firstName: null,
      lastName: null,
      createdAt: null,
      updatedAt: null,
      lastLoginAt: null,
      role: 'member',
      organisationId: null,
    }),
    queryDb: async (sql) => {
      sqlStatements.push(sql)

      if (sql.includes('FROM assessment_results ar')) {
        return {
          rows: [
            {
              id: 'result-1',
              assessment_id: 'assessment-1',
              assessment_version_id: 'version-1',
              version_key: 'v1',
              scoring_model_key: 'model',
              snapshot_version: 1,
              status: 'complete',
              result_payload: null,
              response_quality_payload: null,
              completed_at: '2026-03-20T09:10:00.000Z',
              scored_at: '2026-03-20T09:10:10.000Z',
              created_at: '2026-03-20T09:10:10.000Z',
              updated_at: '2026-03-20T09:10:10.000Z',
              assessment_started_at: '2026-03-20T09:00:00.000Z',
              assessment_completed_at: '2026-03-20T09:10:00.000Z',
              assessment_version_key: 'wplp80-lite-v1',
            },
          ],
        } as never
      }

      return {
        rows: [
          {
            id: 'signal-1',
            assessment_result_id: 'result-1',
            layer_key: 'behaviour',
            signal_key: 'adaptability',
            raw_total: 14,
            max_possible: 20,
            normalised_score: 0.7,
            relative_share: 0.45,
            rank_in_layer: 1,
            is_primary: true,
            is_secondary: false,
            percentile_placeholder: null,
            confidence_flag: null,
            created_at: '2026-03-20T09:10:10.000Z',
          },
        ],
      } as never
    },
  })

  assert.equal(response.ok, true)
  assert.equal(response.state, 'ready')
  assert.ok(
    sqlStatements.some((sql) => /LOWER\(BTRIM\(ad\.category\)\) IN \('individual', 'behavioural_intelligence'\)/i.test(sql)),
  )
})

test('detail loader blocks non-individual category result rows', async () => {
  const response = await loadIndividualResultDetailById('result-1', {
    resolveAuthenticatedAppUser: async () => ({
      id: 'app-user-1',
      dbUserId: 'user-1',
      authUserId: 'auth-1',
      email: 'test@example.com',
      firstName: null,
      lastName: null,
      createdAt: null,
      updatedAt: null,
      lastLoginAt: null,
      role: 'member',
      organisationId: null,
    }),
    queryDb: async () => ({ rows: [] }) as never,
  })

  assert.equal(response.ok, false)
  assert.equal(response.state, 'error')
  assert.equal(response.message, 'Result not found for this user.')
})
