import assert from 'node:assert/strict'
import test from 'node:test'

import { scoreRuntimeV2Assessment } from '../lib/server/runtime-v2-scorer'
import type { RuntimeV2ExecutionModel } from '../lib/server/runtime-v2-repository'

const executionModel: RuntimeV2ExecutionModel = {
  runtimeVersionId: 'runtime-1',
  metadata: { definitionId: 'def-1' },
  questionSets: [],
  questions: [
    { id: 'rq1', runtime_version_id: 'runtime-1', question_id: 'q1', question_set_id: 'set-1', text: 'Q1', display_order: 1 },
  ],
  optionsByQuestionId: {
    q1: [
      { id: 'ro1', runtime_version_id: 'runtime-1', option_id: 'o1', question_id: 'q1', text: 'A', display_order: 1 },
      { id: 'ro2', runtime_version_id: 'runtime-1', option_id: 'o2', question_id: 'q1', text: 'B', display_order: 2 },
    ],
  },
  mappingsByQuestionId: {
    q1: [
      { id: 'm1', runtime_version_id: 'runtime-1', option_id: 'o1', question_id: 'q1', signal_key: 'S1', domain: 'D1', weight: '2', mapping_order: 1 },
      { id: 'm2', runtime_version_id: 'runtime-1', option_id: 'o2', question_id: 'q1', signal_key: 'S2', domain: 'D1', weight: '3', mapping_order: 1 },
    ],
  },
  signalRegistry: { signalKeys: ['S1', 'S2'], domains: ['D1'] },
  scoringConfig: { method: 'sum' },
  normalizationConfig: { method: 'sum_to_100', enforceTotal: 100 },
  outputConfig: {},
}

test('runtime v2 scorer only uses runtime mappings with deterministic duplicate handling', () => {
  const result = scoreRuntimeV2Assessment({
    runtimeVersionId: executionModel.runtimeVersionId,
    executionModel,
    responses: [
      { questionId: 'q1', optionId: 'o2' },
      { questionId: 'q1', optionId: 'o1' },
      { questionId: 'q-missing', optionId: 'ox' },
    ],
  })

  assert.deepEqual(result.rawSignalScores, { S2: 3 })
  assert.deepEqual(result.domainSignalScores, { D1: { S2: 3 } })
  assert.equal(result.answeredQuestionCount, 2)
  assert.equal(result.matchedResponseCount, 1)
  assert.equal(result.unmatchedResponses[0]?.reason, 'question_not_found_in_runtime_v2_execution_model')
})
