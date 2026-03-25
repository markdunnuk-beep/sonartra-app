import assert from 'node:assert/strict'
import test from 'node:test'

import { normalizeRuntimeV2Scores } from '../lib/server/runtime-v2-normalizer'
import type { RuntimeV2ExecutionModel } from '../lib/server/runtime-v2-repository'

const executionModel: RuntimeV2ExecutionModel = {
  runtimeVersionId: 'runtime-1',
  metadata: { definitionId: 'def-1' },
  questionSets: [],
  questions: [],
  optionsByQuestionId: {},
  mappingsByQuestionId: {
    q1: [
      { id: 'm1', runtime_version_id: 'runtime-1', option_id: 'o1', question_id: 'q1', signal_key: 'S1', domain: 'D1', weight: '2', mapping_order: 1 },
      { id: 'm2', runtime_version_id: 'runtime-1', option_id: 'o2', question_id: 'q1', signal_key: 'S2', domain: 'D2', weight: '1', mapping_order: 1 },
    ],
  },
  signalRegistry: { signalKeys: ['S1', 'S2'], domains: ['D1', 'D2'] },
  scoringConfig: { method: 'sum' },
  normalizationConfig: { method: 'sum_to_100', enforceTotal: 100 },
  outputConfig: {},
}

test('runtime v2 normalizer is deterministic and sums to expected totals', () => {
  const normalized = normalizeRuntimeV2Scores({
    rawSignalScores: { S1: 2, S2: 1 },
    executionModel,
  })

  assert.equal(normalized.topSignalKey, 'S1')
  assert.equal(normalized.rankedSignals[0]?.signalKey, 'S1')
  assert.equal(normalized.normalizedSignalPercentages.S1, 66.6667)
  assert.equal(normalized.normalizedSignalPercentages.S2, 33.3333)
  assert.equal(normalized.normalizationDiagnostics.totalNormalizedPercentage, 100)
  assert.equal(normalized.domainSummaries.length, 2)
})
