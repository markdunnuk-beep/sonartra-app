import assert from 'node:assert/strict'
import test from 'node:test'

import { HYBRID_MVP_CONTRACT_VERSION, type HybridMvpAssessmentDefinition } from '../lib/assessment/hybrid-mvp-scoring'
import { parseHybridMvpResultPayload } from '../lib/server/hybrid-mvp-result'
import { evaluateCompletedHybridAssessment } from '../lib/server/live-assessment-hybrid-mvp'
import { withTransaction } from '../lib/db'
import { getLatestAssessmentResultSnapshot } from '../lib/server/assessment-results'

const wplpLiteDefinition: HybridMvpAssessmentDefinition = {
  contractVersion: HYBRID_MVP_CONTRACT_VERSION,
  assessmentId: 'asm_wplp_lite',
  assessmentKey: 'wplp-lite',
  domains: [
    { id: 'style', key: 'style', label: 'Style' },
    { id: 'drive', key: 'drive', label: 'Drive' },
    { id: 'focus', key: 'focus', label: 'Focus' },
  ],
  signals: [
    { id: 'sig_style_a', key: 'Style_A', label: 'Style A', domainId: 'style' },
    { id: 'sig_style_b', key: 'Style_B', label: 'Style B', domainId: 'style' },
    { id: 'sig_drive_a', key: 'Drive_A', label: 'Drive A', domainId: 'drive' },
    { id: 'sig_drive_b', key: 'Drive_B', label: 'Drive B', domainId: 'drive' },
    { id: 'sig_focus_a', key: 'Focus_A', label: 'Focus A', domainId: 'focus' },
  ],
  questions: Array.from({ length: 12 }, (_, index) => ({
    id: `q${index + 1}`,
    prompt: `Question ${index + 1}`,
    responseModel: index % 3 === 0 ? 'multi_select' : 'single_select',
    options: [
      {
        id: `q${index + 1}_a`,
        label: 'Option A',
        signalWeights: [
          { signalId: 'sig_style_a', weight: 2 },
          { signalId: 'sig_drive_a', weight: 1 },
        ],
      },
      {
        id: `q${index + 1}_b`,
        label: 'Option B',
        signalWeights: [
          { signalId: 'sig_style_b', weight: 1 },
          { signalId: 'sig_drive_b', weight: 2 },
          { signalId: 'sig_focus_a', weight: 1 },
        ],
      },
    ],
  })),
  outputTemplates: {
    overview: {
      default: 'Top signal is {topSignalLabel} at {topSignalScorePercent}.',
    },
    signalNarratives: {
      sig_style_a: {
        high: 'Signal {signalLabel} is high at {normalizedPercent}.',
      },
    },
    domainNarratives: {
      style: {
        summary: '{domainLabel} is led by {topSignalLabel} ({topSignalPercent}).',
      },
    },
  },
}

function buildResponseEnvelope(definition: HybridMvpAssessmentDefinition) {
  const responses: Record<string, string | string[]> = {}
  const updatedAtByQuestionId: Record<string, string> = {}

  for (const question of definition.questions) {
    if (question.responseModel === 'multi_select') {
      responses[question.id] = [question.options[0]!.id, question.options[1]!.id]
    } else {
      responses[question.id] = question.options[0]!.id
    }
    updatedAtByQuestionId[question.id] = '2026-03-24T00:00:00.000Z'
  }

  return {
    liveHybridMvpV1: {
      responses,
      updatedAtByQuestionId,
    },
  }
}

test('evaluateCompletedHybridAssessment persists a valid result payload for multi-domain hybrid fixture', async () => {
  const definitionPayload = wplpLiteDefinition as unknown
  const metadataJson = buildResponseEnvelope(wplpLiteDefinition)

  const state = {
    assessmentStatus: 'in_progress',
    scoringStatus: 'not_scored',
  }

  let latestPersistedPayload: Record<string, unknown> | null = null

  const withTransactionFn = async <T,>(work: (client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> }) => Promise<T>): Promise<T> => {
    const client = {
      query: async (sql: string) => {
        if (sql.includes('FROM assessments a') && sql.includes('assessment_version_definition_payload')) {
          return {
            rows: [
              {
                assessment_id: 'assessment-1',
                assessment_version_id: 'version-1',
                assessment_version_key: 'wplp-lite-v1',
                assessment_version_name: 'WPLP Lite V1',
                assessment_definition_id: 'definition-1',
                assessment_version_definition_payload: definitionPayload,
                published_version_id: 'version-1',
                published_version_key: 'wplp-lite-v1',
                published_version_name: 'WPLP Lite V1',
                published_definition_payload: definitionPayload,
                assessment_status: state.assessmentStatus,
                total_questions: wplpLiteDefinition.questions.length,
                metadata_json: metadataJson,
                completed_at: '2026-03-24T00:00:00.000Z',
                scoring_status: state.scoringStatus,
              },
            ],
          }
        }

        if (sql.includes('SET status = \'completed\'')) {
          state.assessmentStatus = 'completed'
          state.scoringStatus = 'pending'
          return { rows: [{ completed_at: '2026-03-24T00:00:00.000Z' }] }
        }

        if (sql.includes("SET scoring_status = 'scored'")) {
          state.scoringStatus = 'scored'
          return { rows: [] }
        }

        throw new Error(`Unexpected SQL in test harness: ${sql}`)
      },
    }

    return work(client)
  }

  const result = await evaluateCompletedHybridAssessment(
    {
      assessmentId: 'assessment-1',
      ownerUserId: 'user-1',
      persistResult: async (payload) => {
        latestPersistedPayload = payload.resultPayload
        return { assessmentResultId: 'result-1' }
      },
    },
    {
      withTransactionFn: withTransactionFn as unknown as typeof withTransaction,
      getLatestResultSnapshot: (async () => null) as unknown as typeof getLatestAssessmentResultSnapshot,
    },
  )

  assert.equal(result.httpStatus, 200)
  assert.equal(result.body.ok, true)
  assert.equal(result.body.resultStatus, 'succeeded')
  assert.equal(result.body.resultId, 'result-1')

  const parsed = parseHybridMvpResultPayload(latestPersistedPayload)
  assert.ok(parsed)

  const normalizedSum = Number(Object.values(parsed.normalizedSignalScores).reduce((sum, value) => sum + value, 0).toFixed(6))
  assert.equal(Math.abs(1 - normalizedSum) <= 0.00001, true)
  assert.equal(parsed.domainSummaries.length >= 3, true)
  assert.equal(parsed.topSignal !== null, true)
})
