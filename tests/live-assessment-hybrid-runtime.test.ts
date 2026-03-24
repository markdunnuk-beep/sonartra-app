import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateCompletedHybridAssessment, saveHybridAssessmentResponse } from '../lib/server/live-assessment-hybrid-mvp'
import { HYBRID_MVP_CONTRACT_VERSION, type HybridMvpAssessmentDefinition } from '../lib/assessment/hybrid-mvp-scoring'

const hybridDefinition: HybridMvpAssessmentDefinition = {
  contractVersion: HYBRID_MVP_CONTRACT_VERSION,
  assessmentId: 'assessment-hybrid-foundation',
  assessmentKey: 'hybrid-foundation',
  domains: [{ id: 'domain-self', key: 'self', label: 'Self' }],
  signals: [
    { id: 'signal-focus', key: 'focus', label: 'Focus', domainId: 'domain-self' },
    { id: 'signal-drive', key: 'drive', label: 'Drive', domainId: 'domain-self' },
  ],
  questions: [
    {
      id: 'q1',
      prompt: 'Question 1',
      responseModel: 'single_select',
      options: [
        { id: 'q1_a', label: 'A', signalWeights: [{ signalId: 'signal-focus', weight: 2 }] },
        { id: 'q1_b', label: 'B', signalWeights: [{ signalId: 'signal-drive', weight: 1 }] },
      ],
    },
    {
      id: 'q2',
      prompt: 'Question 2',
      responseModel: 'single_select',
      options: [
        { id: 'q2_a', label: 'A', signalWeights: [{ signalId: 'signal-focus', weight: 1 }] },
        { id: 'q2_b', label: 'B', signalWeights: [{ signalId: 'signal-drive', weight: 2 }] },
      ],
    },
  ],
}

test('evaluateCompletedHybridAssessment persists canonical hybrid result payload on success', async () => {
  const updates: string[] = []
  const persistedPayloads: Array<{ status: 'complete' | 'failed'; resultPayload: Record<string, unknown> | null }> = []

  const result = await evaluateCompletedHybridAssessment({
    assessmentId: 'assessment-hybrid-1',
    ownerUserId: 'user-1',
    persistResult: async (payload) => {
      persistedPayloads.push({ status: payload.status, resultPayload: payload.resultPayload })
      return { assessmentResultId: 'result-hybrid-1' }
    },
  }, {
    withTransactionFn: (async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
          return {
            rows: [{
              assessment_id: 'assessment-hybrid-1',
              assessment_version_id: 'version-hybrid-1',
              assessment_version_key: 'hybrid-v1',
              assessment_version_name: 'Hybrid v1',
              assessment_definition_id: 'definition-hybrid',
              assessment_version_definition_payload: hybridDefinition,
              published_version_id: 'version-hybrid-1',
              published_version_key: 'hybrid-v1',
              published_version_name: 'Hybrid v1',
              published_definition_payload: hybridDefinition,
              assessment_status: 'in_progress',
              total_questions: 2,
              metadata_json: {
                liveHybridMvpV1: {
                  responses: { q1: 'q1_a', q2: 'q2_b' },
                  updatedAtByQuestionId: {
                    q1: '2026-03-24T10:00:00.000Z',
                    q2: '2026-03-24T10:01:00.000Z',
                  },
                },
              },
              completed_at: null,
              scoring_status: 'not_scored',
            }],
          }
        }

        if (/UPDATE assessments/i.test(sql)) {
          updates.push(sql)
          return { rows: [{ completed_at: '2026-03-24T10:05:00.000Z' }] }
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never)) as never,
    getLatestResultSnapshot: (async () => null) as never,
  })

  assert.equal(result.httpStatus, 200)
  assert.equal(result.body.ok, true)
  if (!result.body.ok) return
  assert.equal(result.body.resultStatus, 'succeeded')
  assert.equal(result.body.resultId, 'result-hybrid-1')
  assert.equal(persistedPayloads.length, 1)
  assert.equal(persistedPayloads[0]?.status, 'complete')
  const payload = persistedPayloads[0]?.resultPayload ?? {}
  assert.equal(payload.contractVersion, HYBRID_MVP_CONTRACT_VERSION)
  assert.equal('rawSignalScores' in payload, true)
  assert.equal('normalizedSignalScores' in payload, true)
  assert.equal('rankedSignals' in payload, true)
  assert.equal('aggregationVectors' in payload, true)
  assert.equal('report' in payload, true)
  assert.equal(updates.length, 2)
})

test('evaluateCompletedHybridAssessment fails fast on incomplete hybrid response sets', async () => {
  let persistCalls = 0
  const result = await evaluateCompletedHybridAssessment({
    assessmentId: 'assessment-hybrid-2',
    ownerUserId: 'user-1',
    persistResult: async () => {
      persistCalls += 1
      return { assessmentResultId: 'unused' }
    },
  }, {
    withTransactionFn: (async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
          return {
            rows: [{
              assessment_id: 'assessment-hybrid-2',
              assessment_version_id: 'version-hybrid-2',
              assessment_version_key: 'hybrid-v1',
              assessment_version_name: 'Hybrid v1',
              assessment_definition_id: 'definition-hybrid',
              assessment_version_definition_payload: hybridDefinition,
              published_version_id: 'version-hybrid-2',
              published_version_key: 'hybrid-v1',
              published_version_name: 'Hybrid v1',
              published_definition_payload: hybridDefinition,
              assessment_status: 'in_progress',
              total_questions: 2,
              metadata_json: {
                liveHybridMvpV1: {
                  responses: { q1: 'q1_a' },
                  updatedAtByQuestionId: { q1: '2026-03-24T10:00:00.000Z' },
                },
              },
              completed_at: null,
              scoring_status: 'not_scored',
            }],
          }
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never)) as never,
    getLatestResultSnapshot: (async () => null) as never,
  })

  assert.equal(result.httpStatus, 400)
  assert.deepEqual(result.body, {
    ok: false,
    error: 'Assessment cannot be completed. Expected 2 responses, found 1.',
  })
  assert.equal(persistCalls, 0)
})

test('evaluateCompletedHybridAssessment marks scoring failed when persistence fails during success path', async () => {
  let persistCalls = 0
  const updateSqls: string[] = []

  const result = await evaluateCompletedHybridAssessment({
    assessmentId: 'assessment-hybrid-3',
    ownerUserId: 'user-1',
    persistResult: async (payload) => {
      persistCalls += 1
      if (persistCalls === 1) {
        throw new Error('simulated persistence failure')
      }
      assert.equal(payload.status, 'failed')
      return { assessmentResultId: 'result-hybrid-failed' }
    },
  }, {
    withTransactionFn: (async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string) => {
        if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
          return {
            rows: [{
              assessment_id: 'assessment-hybrid-3',
              assessment_version_id: 'version-hybrid-3',
              assessment_version_key: 'hybrid-v1',
              assessment_version_name: 'Hybrid v1',
              assessment_definition_id: 'definition-hybrid',
              assessment_version_definition_payload: hybridDefinition,
              published_version_id: 'version-hybrid-3',
              published_version_key: 'hybrid-v1',
              published_version_name: 'Hybrid v1',
              published_definition_payload: hybridDefinition,
              assessment_status: 'in_progress',
              total_questions: 2,
              metadata_json: {
                liveHybridMvpV1: {
                  responses: { q1: 'q1_a', q2: 'q2_b' },
                  updatedAtByQuestionId: {
                    q1: '2026-03-24T10:00:00.000Z',
                    q2: '2026-03-24T10:01:00.000Z',
                  },
                },
              },
              completed_at: null,
              scoring_status: 'not_scored',
            }],
          }
        }

        if (/UPDATE assessments/i.test(sql)) {
          updateSqls.push(sql)
          return { rows: [{ completed_at: '2026-03-24T10:05:00.000Z' }] }
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never)) as never,
    getLatestResultSnapshot: (async () => null) as never,
  })

  assert.equal(result.httpStatus, 200)
  assert.equal(result.body.ok, true)
  if (!result.body.ok) return
  assert.equal(result.body.resultStatus, 'failed')
  assert.equal(result.body.resultId, 'result-hybrid-failed')
  assert.equal(persistCalls, 2)
  assert.equal(updateSqls.length, 2)
})

test('saveHybridAssessmentResponse persists canonical hybrid response envelope', async () => {
  const updates: unknown[][] = []
  const save = await saveHybridAssessmentResponse({
    assessmentId: 'assessment-hybrid-save',
    appUserId: 'user-1',
    questionId: 'q2',
    response: 'q2_b',
  }, {
    withTransactionFn: (async <T>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }> }) => Promise<T>) => work({
      query: async (sql: string, params: unknown[] = []) => {
        if (/FROM assessments a\s+INNER JOIN assessment_versions av/i.test(sql)) {
          return {
            rows: [{
              assessment_id: 'assessment-hybrid-save',
              assessment_version_id: 'version-hybrid-save',
              assessment_version_key: 'hybrid-v1',
              assessment_version_name: 'Hybrid v1',
              assessment_definition_id: 'definition-hybrid',
              assessment_version_definition_payload: hybridDefinition,
              published_version_id: 'version-hybrid-save',
              published_version_key: 'hybrid-v1',
              published_version_name: 'Hybrid v1',
              published_definition_payload: hybridDefinition,
              assessment_status: 'in_progress',
              total_questions: 2,
              metadata_json: {
                liveHybridMvpV1: {
                  responses: { q1: 'q1_a' },
                  updatedAtByQuestionId: { q1: '2026-03-24T10:00:00.000Z' },
                },
              },
              completed_at: null,
              scoring_status: 'not_scored',
            }],
          }
        }

        if (/UPDATE assessments/i.test(sql)) {
          updates.push(params)
          return { rows: [] }
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
    } as never)) as never,
  })

  assert.equal(save.status, 200)
  assert.equal(updates.length, 1)
  const metadata = JSON.parse(String(updates[0]?.[1] ?? '{}'))
  assert.equal(metadata.liveHybridMvpV1.responses.q1, 'q1_a')
  assert.equal(metadata.liveHybridMvpV1.responses.q2, 'q2_b')
})
