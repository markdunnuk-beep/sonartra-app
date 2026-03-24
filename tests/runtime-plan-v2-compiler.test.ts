import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'
import { compileRuntimeContractV2 } from '../lib/admin/domain/runtime-plan-v2-compiler'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'

function compileRuntimeFixture() {
  const canonicalValidation = validateSonartraAssessmentPackageV2(examplePackage)
  assert.equal(canonicalValidation.ok, true)

  const runtimeCompilation = compileAssessmentPackageV2(canonicalValidation.normalizedPackage!)
  assert.equal(runtimeCompilation.ok, true)
  assert.ok(runtimeCompilation.executablePackage)

  return runtimeCompilation.executablePackage!
}

test('runtime contract v2 compiles into deterministic execution-ready runtime plan', () => {
  const runtimeContract = compileRuntimeFixture()

  const first = compileRuntimeContractV2(runtimeContract)
  const second = compileRuntimeContractV2(runtimeContract)

  assert.equal(first.ok, true)
  assert.equal(second.ok, true)
  assert.deepEqual(first.compiledPlan, second.compiledPlan)
  assert.equal(first.compiledPlan?.executionOrder.derivedDimensionIds[0], 'adaptive-balance')
  assert.ok(first.compiledPlan?.aggregations['raw:stability'])
})

test('runtime plan compiler fails unresolved references with stage-tagged diagnostics', () => {
  const runtimeContract = compileRuntimeFixture()
  runtimeContract.dimensionsById.stability.itemBindings[0]!.questionId = 'unknown-question'

  const result = compileRuntimeContractV2(runtimeContract)

  assert.equal(result.ok, false)
  assert.ok(result.diagnostics.some((entry) => entry.code === 'unresolved_reference' && entry.stage === 'reference_resolution'))
})

test('runtime plan compiler detects cyclic dependencies across derived dimensions', () => {
  const runtimeContract = compileRuntimeFixture()
  runtimeContract.derivedDimensionsById['adaptive-balance'] = {
    ...runtimeContract.derivedDimensionsById['adaptive-balance'],
    dependencies: ['derived-b'],
  }
  runtimeContract.derivedDimensionsById['derived-b'] = {
    id: 'derived-b',
    kind: 'derived',
    label: 'Derived B',
    dependencies: ['adaptive-balance'],
    computation: {
      method: 'formula',
      formula: 'adaptive-balance',
      expression: null,
      ruleId: null,
    },
    transformIds: [],
    normalizationRuleIds: [],
    downstreamOutputRuleIds: [],
  }

  const result = compileRuntimeContractV2(runtimeContract)

  assert.equal(result.ok, false)
  assert.ok(result.diagnostics.some((entry) => entry.code === 'cyclic_dependency' && entry.path === 'derivedDimensionsById'))
})

test('canonical import path compiles canonical v2 to runtime and then compiled runtime plan', () => {
  const imported = importAssessmentPackagePayload(examplePackage)

  assert.equal(imported.classifier, 'canonical_contract_v2')
  assert.equal(imported.analysis.compiledRuntimeArtifactProduced, true)
  assert.equal(imported.analysis.compiledRuntimePlanProduced, true)
  assert.ok(imported.analysis.compiledRuntimePlan)
  assert.equal(imported.analysis.diagnostics.compilation.length >= 0, true)
  assert.equal((imported.analysis.diagnostics.planCompilation?.length ?? 0) >= 0, true)
})

test('runtime import path compiles directly to runtime plan without canonical assumptions', () => {
  const runtimeContract = compileRuntimeFixture()

  const imported = importAssessmentPackagePayload(runtimeContract)

  assert.equal(imported.classifier, 'runtime_contract_v2')
  assert.equal(imported.analysis.compileRequired, false)
  assert.equal(imported.analysis.compiledRuntimePlanProduced, true)
  assert.ok(imported.analysis.compiledRuntimePlan)
})
