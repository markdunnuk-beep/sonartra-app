import assert from 'node:assert/strict'
import test from 'node:test'

import { parseRuntimeV2ReadyPayload } from '../lib/server/runtime-v2-readiness'

test('runtime v2 readiness accepts structurally complete payload', () => {
  const payload = {
    resultFormat: 'runtime_v2',
    metadata: {
      definitionId: 'def-1',
      assessmentVersionId: 'ver-1',
      runtimeVersionId: 'runtime-1',
      runtimeContractVersion: 'v2',
    },
    overviewSummary: 'ok',
    topSignal: null,
    rankedSignals: [{ signalKey: 'S1', score: 1, percentage: 100, rank: 1 }],
    normalizedScores: { S1: 100 },
    domainSummaries: [],
    strengths: [],
    watchouts: [],
    developmentFocus: [],
    diagnostics: { answeredQuestionCount: 1, matchedResponseCount: 1, unmatchedResponseCount: 0, normalization: { method: 'sum_to_100', totalRawScore: 1, totalNormalizedPercentage: 100, signalCount: 1, domainCount: 0 } },
  }

  const parsed = parseRuntimeV2ReadyPayload(payload)
  assert.equal(parsed.state, 'ready')
})

test('runtime v2 readiness rejects partial payloads', () => {
  const parsed = parseRuntimeV2ReadyPayload({ resultFormat: 'runtime_v2', metadata: {} })
  assert.notEqual(parsed.state, 'ready')
})
