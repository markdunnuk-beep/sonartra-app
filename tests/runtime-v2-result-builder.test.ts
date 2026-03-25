import assert from 'node:assert/strict'
import test from 'node:test'

import { buildRuntimeV2ResultPayload } from '../lib/server/runtime-v2-result-builder'
import type { RuntimeV2ExecutionModel } from '../lib/server/runtime-v2-repository'

const executionModel: RuntimeV2ExecutionModel = {
  runtimeVersionId: 'runtime-1',
  metadata: { definitionId: 'def-1' },
  questionSets: [],
  questions: [],
  optionsByQuestionId: {},
  mappingsByQuestionId: {},
  signalRegistry: { signalKeys: ['S1'], domains: ['D1'] },
  scoringConfig: { method: 'sum' },
  normalizationConfig: { method: 'sum_to_100', enforceTotal: 100 },
  outputConfig: {},
}

test('runtime v2 result builder emits canonical payload shape', () => {
  const payload = buildRuntimeV2ResultPayload({
    executionModel,
    assessmentVersionId: 'ver-1',
    materializationFingerprint: { questionCount: 1 },
    scoring: {
      rawSignalScores: { S1: 2 },
      domainSignalScores: { D1: { S1: 2 } },
      answeredQuestionCount: 1,
      matchedResponseCount: 1,
      unmatchedResponses: [],
    },
    normalization: {
      normalizedSignalPercentages: { S1: 100 },
      rankedSignals: [{ signalKey: 'S1', score: 2, percentage: 100, domain: 'D1', rank: 1 }],
      domainSummaries: [{ domain: 'D1', signals: [{ signalKey: 'S1', score: 2, percentage: 100, rank: 1 }], topSignalKey: 'S1', totalScore: 2 }],
      topSignalKey: 'S1',
      normalizationDiagnostics: {
        method: 'sum_to_100',
        totalRawScore: 2,
        totalNormalizedPercentage: 100,
        signalCount: 1,
        domainCount: 1,
      },
    },
  })

  assert.equal(payload.resultFormat, 'runtime_v2')
  assert.equal(payload.metadata.runtimeContractVersion, 'v2')
  assert.equal(payload.topSignal?.signalKey, 'S1')
  assert.equal(payload.rankedSignals.length, 1)
  assert.equal(payload.diagnostics.matchedResponseCount, 1)
})
