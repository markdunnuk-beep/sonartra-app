import assert from 'node:assert/strict'
import test from 'node:test'
import type { SonartraAssessmentPackageV2 } from '../lib/contracts/package-contract-v2'
import { compilePackageToRuntimeContract } from '../lib/server/package-compiler-v2'
import { validatePackageV2 } from '../lib/server/package-validator-v2'

function buildCompilerFixture(): SonartraAssessmentPackageV2 {
  return {
    metadata: {
      definitionId: 'compiler-demo',
      version: '2.1.0',
      title: 'Compiler Demo',
      description: 'Compiler fixture',
    },
    questionSets: [{ id: 'set-1', title: 'Primary', order: 1 }],
    questions: [
      { id: 'q-2', questionSetId: 'set-1', text: 'Second', order: 2 },
      { id: 'q-1', questionSetId: 'set-1', text: 'First', order: 1 },
    ],
    options: [
      { id: 'o-2', questionId: 'q-1', text: 'Option B', order: 2 },
      { id: 'o-1', questionId: 'q-1', text: 'Option A', order: 1 },
      { id: 'o-3', questionId: 'q-2', text: 'Option C', order: 1 },
    ],
    signalMappings: [
      { optionId: 'o-1', signalKey: 'focus', weight: 1, domain: 'cognitive' },
      { optionId: 'o-2', signalKey: 'energy', weight: 2, domain: 'cognitive' },
      { optionId: 'o-3', signalKey: 'calm', weight: 3, domain: 'emotional' },
    ],
    scoring: { method: 'weighted_sum' },
    normalization: { method: 'percentage_distribution', enforceTotal: 100 },
    output: { generateRankings: true, generateDomainSummaries: true, generateOverview: true },
  }
}

test('compiler produces runtime contract with expected counts and grouped mappings', () => {
  const validated = validatePackageV2(buildCompilerFixture())
  assert.equal(validated.valid, true)
  const runtime = compilePackageToRuntimeContract(validated.normalized!)

  assert.equal(runtime.compiledQuestions.length, 2)
  assert.equal(runtime.compiledOptions.length, 3)
  assert.equal(runtime.compiledSignalMappings['q-1']?.length, 2)
  assert.equal(runtime.compiledSignalMappings['q-2']?.length, 1)
  assert.deepEqual(runtime.normalizationPrep.expectedSignalKeys, ['calm', 'energy', 'focus'])
})

test('compiler output is stable for identical inputs', () => {
  const validated = validatePackageV2(buildCompilerFixture())
  assert.equal(validated.valid, true)

  const runtimeOne = compilePackageToRuntimeContract(validated.normalized!)
  const runtimeTwo = compilePackageToRuntimeContract(validated.normalized!)

  assert.equal(JSON.stringify(runtimeOne), JSON.stringify(runtimeTwo))
})

test('compiler snapshot contract shape remains deterministic', () => {
  const validated = validatePackageV2(buildCompilerFixture())
  assert.equal(validated.valid, true)
  const runtime = compilePackageToRuntimeContract(validated.normalized!)

  const snapshot = {
    questionIds: runtime.compiledQuestions.map((question) => question.id),
    mappingKeys: Object.keys(runtime.compiledSignalMappings),
    signalKeys: runtime.signalRegistry.signalKeys,
    domains: runtime.signalRegistry.domains,
    normalizationMethod: runtime.normalizationPrep.method,
  }

  assert.deepEqual(snapshot, {
    questionIds: ['q-1', 'q-2'],
    mappingKeys: ['q-1', 'q-2'],
    signalKeys: ['calm', 'energy', 'focus'],
    domains: ['cognitive', 'emotional'],
    normalizationMethod: 'percentage_distribution',
  })
})
