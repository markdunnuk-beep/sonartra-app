import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'
import { compileRuntimeContractV2 } from '../lib/admin/domain/runtime-plan-v2-compiler'
import { executeCompiledRuntimePlanV2, normalizeRuntimeResponsesForExecutionV2 } from '../lib/admin/domain/runtime-plan-v2-executor'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'

function compileFixture() {
  const validated = validateSonartraAssessmentPackageV2(examplePackage)
  assert.equal(validated.ok, true)

  const executable = compileAssessmentPackageV2(validated.normalizedPackage!)
  assert.equal(executable.ok, true)
  assert.ok(executable.executablePackage)

  const plan = compileRuntimeContractV2(executable.executablePackage!)
  assert.equal(plan.ok, true)
  assert.ok(plan.compiledPlan)

  return { executable: executable.executablePackage!, plan: plan.compiledPlan! }
}

test('compiled runtime plan v2 executes and returns stage-separated deterministic result shape', () => {
  const { executable, plan } = compileFixture()
  const responses = normalizeRuntimeResponsesForExecutionV2({
    responses: {
      'q-energy-level': 'often',
      'q-change-comfort': 'agree',
      'q-recovery-speed': 'quick',
      'q-priority-clarity': 'yes',
    },
  })

  const result = executeCompiledRuntimePlanV2(plan, responses, { executablePackage: executable, evaluationTimestamp: '2026-03-24T00:00:00.000Z' })

  assert.equal(result.summary.timestamp, '2026-03-24T00:00:00.000Z')
  assert.ok(result.stages.scoring)
  assert.ok(result.stages.derivation)
  assert.ok(result.stages.normalization)
  assert.ok(result.stages.aggregation)
  assert.ok(result.stages.integrity)
  assert.ok(result.stages.outputs)
  assert.deepEqual(Object.keys(result.scoring.rawDimensionValues), plan.executionOrder.rawDimensionIds)
  assert.deepEqual(Object.keys(result.derivation.derivedDimensionValues), plan.executionOrder.derivedDimensionIds)
})

test('scoring reports missing runtime inputs explicitly', () => {
  const { executable, plan } = compileFixture()
  const responses = normalizeRuntimeResponsesForExecutionV2({ responses: { 'q-energy-level': 'often' } })

  const result = executeCompiledRuntimePlanV2(plan, responses, { executablePackage: executable })

  assert.equal(result.issues.some((issue) => issue.code === 'missing_response' && issue.stage === 'scoring'), true)
})

test('derived stage computes in dependency order and skips deterministically on upstream failures', () => {
  const { executable, plan } = compileFixture()
  const firstQuestionId = plan.executionOrder.questionIds[0]!
  delete executable.responseModels.modelsById[plan.itemMap[firstQuestionId]!.responseModelId]
  const responses = normalizeRuntimeResponsesForExecutionV2({ responses: { [firstQuestionId]: 'often' } })

  const result = executeCompiledRuntimePlanV2(plan, responses, { executablePackage: executable })

  assert.equal(plan.executionOrder.derivedDimensionIds[0], 'adaptive-balance')
  assert.equal(result.issues.some((issue) => issue.stage === 'derivation' && issue.code === 'skipped_due_to_upstream_failure'), true)
  assert.equal(result.stages.derivation.status, 'skipped')
  assert.equal(result.stages.derivation.outcome, 'skipped')
  assert.equal(result.stages.outputs.status, 'skipped')
  assert.equal(result.stages.outputs.outcome, 'skipped')
})

test('normalization emits unsupported_execution_pattern when method is unsupported', () => {
  const { executable, plan } = compileFixture()
  const firstNormalizationRuleId = Object.keys(executable.normalizationRulesById)[0]
  executable.normalizationRulesById[firstNormalizationRuleId] = {
    ...executable.normalizationRulesById[firstNormalizationRuleId],
    method: 'unsupported_normalization_method' as never,
  }

  const responses = normalizeRuntimeResponsesForExecutionV2({ responses: {
    'q-energy-level': 'often',
    'q-change-comfort': 'agree',
    'q-recovery-speed': 'quick',
    'q-priority-clarity': 'yes',
  } })

  const result = executeCompiledRuntimePlanV2(plan, responses, { executablePackage: executable })

  assert.equal(result.issues.some((issue) => issue.stage === 'normalization' && issue.code === 'unsupported_execution_pattern'), true)
  assert.equal(result.stages.normalization.outcome, 'partial')
  assert.equal(result.outcome, 'partial')
})

test('aggregation covers raw and derived deterministic ids', () => {
  const { executable, plan } = compileFixture()
  const responses = normalizeRuntimeResponsesForExecutionV2({
    responses: {
      'q-energy-level': 'often',
      'q-change-comfort': 'agree',
      'q-recovery-speed': 'quick',
      'q-priority-clarity': 'yes',
    },
  })

  const result = executeCompiledRuntimePlanV2(plan, responses, { executablePackage: executable })

  assert.deepEqual(result.aggregation.entries.map((entry) => entry.aggregationId), plan.executionOrder.aggregationIds)
  assert.equal(result.aggregation.entries.some((entry) => entry.source.kind === 'raw_dimension'), true)
  assert.equal(result.aggregation.entries.some((entry) => entry.source.kind === 'derived_dimension'), true)
})

test('integrity and outputs produce structured deterministic ids and ordering', () => {
  const { executable, plan } = compileFixture()
  const responses = normalizeRuntimeResponsesForExecutionV2({
    responses: {
      'q-energy-level': 'often',
      'q-change-comfort': 'agree',
      'q-recovery-speed': 'quick',
      'q-priority-clarity': 'yes',
    },
  })

  const result = executeCompiledRuntimePlanV2(plan, responses, { executablePackage: executable })

  assert.deepEqual(result.integrity.entries.map((entry) => entry.ruleId), plan.executionOrder.integrityRuleIds)
  assert.deepEqual([...result.outputs.matchedRuleIds, ...result.outputs.unmetRuleIds].sort(), plan.executionOrder.outputRuleIds.slice().sort())
})

test('canonical import and runtime import paths can execute through compiled runtime artifacts', () => {
  const canonicalImported = importAssessmentPackagePayload(examplePackage)
  assert.ok(canonicalImported.analysis.compiledRuntimeArtifact)
  assert.ok(canonicalImported.analysis.compiledRuntimePlan)

  const canonicalResponses = normalizeRuntimeResponsesForExecutionV2({ responses: { 'q-energy-level': 'often' } })
  const canonicalResult = executeCompiledRuntimePlanV2(
    canonicalImported.analysis.compiledRuntimePlan!,
    canonicalResponses,
    { executablePackage: canonicalImported.analysis.compiledRuntimeArtifact! },
  )
  assert.ok(canonicalResult.status)

  const runtimeImported = importAssessmentPackagePayload(canonicalImported.analysis.compiledRuntimeArtifact!)
  assert.ok(runtimeImported.analysis.compiledRuntimeArtifact)
  assert.ok(runtimeImported.analysis.compiledRuntimePlan)

  const runtimeResult = executeCompiledRuntimePlanV2(
    runtimeImported.analysis.compiledRuntimePlan!,
    canonicalResponses,
    { executablePackage: runtimeImported.analysis.compiledRuntimeArtifact! },
  )

  assert.ok(runtimeResult.status)
})
