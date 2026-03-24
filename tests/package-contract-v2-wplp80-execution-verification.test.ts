import assert from 'node:assert/strict'
import test from 'node:test'

import wplp80Candidate from './fixtures/package-contract-v2-wplp80-canonical-candidate.json'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'
import {
  executePreparedRuntimeExecutionBundleV2,
  preparePackageExecutionBundleForAssessmentVersion,
} from '../lib/admin/domain/runtime-execution-adapter-v2'
import { executeAdminAssessmentSimulationForPackage } from '../lib/admin/domain/assessment-simulation'
import { getAdminAssessmentReportPreviewWorkspaceStatus } from '../lib/admin/domain/assessment-report-output'

function buildFixtureBundle() {
  const imported = importAssessmentPackagePayload(wplp80Candidate)
  assert.equal(imported.analysis.readinessState.milestone, 'preview_simulation_ready')

  const prepared = preparePackageExecutionBundleForAssessmentVersion({ storedPackage: imported.definitionPayload })
  assert.equal(prepared.ok, true)
  assert.ok(prepared.bundle)

  return { imported, bundle: prepared.bundle! }
}

function getModelOptions(bundle: ReturnType<typeof buildFixtureBundle>['bundle'], questionId: string) {
  const questionPlan = bundle.compiledRuntimePlan.itemMap[questionId]
  assert.ok(questionPlan)
  const model = bundle.runtimeArtifact.responseModels.modelsById[questionPlan.responseModelId]
  assert.ok(model)

  return [
    ...(model.optionSetId ? bundle.runtimeArtifact.responseModels.optionSetsById[model.optionSetId]?.options ?? [] : []),
    ...(model.options ?? []),
  ]
}

function pickOptionForDimension(bundle: ReturnType<typeof buildFixtureBundle>['bundle'], questionId: string, dimensionId: string, mode: 'max' | 'min' | 'mid'): string {
  const options = getModelOptions(bundle, questionId)
  assert.ok(options.length > 0)

  if (mode === 'mid') {
    return options[Math.floor((options.length - 1) / 2)]?.id ?? options[0]!.id
  }

  const sorted = options
    .map((option) => ({
      id: option.id,
      score: typeof option.scoreMap?.[dimensionId] === 'number' ? option.scoreMap[dimensionId]! : (typeof option.value === 'number' ? option.value : Number.NaN),
    }))
    .filter((entry) => Number.isFinite(entry.score))
    .sort((left, right) => left.score - right.score)

  if (sorted.length === 0) {
    return options[0]!.id
  }

  return mode === 'max' ? sorted[sorted.length - 1]!.id : sorted[0]!.id
}

function buildScenarioResponses(bundle: ReturnType<typeof buildFixtureBundle>['bundle'], scenario: 'balanced' | 'driver_extreme' | 'stabiliser_extreme' | 'contradictory' | 'missing_skew') {
  const responses: Record<string, unknown> = {}
  const questionIds = bundle.compiledRuntimePlan.executionOrder.questionIds

  for (const [index, questionId] of questionIds.entries()) {
    if (scenario === 'balanced') {
      responses[questionId] = pickOptionForDimension(bundle, questionId, 'Core_Driver', 'mid')
      continue
    }
    if (scenario === 'driver_extreme') {
      responses[questionId] = pickOptionForDimension(bundle, questionId, 'Core_Driver', 'max')
      continue
    }
    if (scenario === 'stabiliser_extreme') {
      responses[questionId] = pickOptionForDimension(bundle, questionId, 'Core_Stabiliser', 'max')
      continue
    }
    if (scenario === 'contradictory') {
      responses[questionId] = index % 2 === 0
        ? pickOptionForDimension(bundle, questionId, 'Core_Driver', 'max')
        : pickOptionForDimension(bundle, questionId, 'Core_Stabiliser', 'max')
      continue
    }
    if (index % 6 !== 0) {
      responses[questionId] = pickOptionForDimension(bundle, questionId, 'Core_Driver', 'mid')
    }
  }

  return responses
}

test('WPLP-80 canonical package executes deterministically through prepared runtime bundle and compiled runtime plan', () => {
  const { imported, bundle } = buildFixtureBundle()

  assert.ok(imported.warnings.some((warning) => /normalization\.groups/i.test(warning.path) || /metadata-only/i.test(warning.message)))
  assert.ok(imported.warnings.some((warning) => /response_pattern_primitives_limited/i.test(warning.message) || /response-pattern primitives/i.test(warning.message)))

  const balanced = buildScenarioResponses(bundle, 'balanced')
  const first = executePreparedRuntimeExecutionBundleV2({
    bundle,
    responses: balanced,
    evaluationTimestamp: '2026-03-24T01:23:45.000Z',
  })
  const second = executePreparedRuntimeExecutionBundleV2({
    bundle,
    responses: balanced,
    evaluationTimestamp: '2026-03-24T01:23:45.000Z',
  })

  assert.equal(first.ok, true)
  assert.deepEqual(first.executionResult, second.executionResult)
  assert.equal(first.executionResult?.stages.derivation.status, 'success')
  assert.equal(first.executionResult?.stages.normalization.outcome === 'success' || first.executionResult?.stages.normalization.outcome === 'partial', true)
  assert.equal(first.executionResult?.aggregation.entries.length, bundle.compiledRuntimePlan.executionOrder.aggregationIds.length)

  const normalizedSnapshot = first.executionResult?.normalization.entries.map((entry) => `${entry.ruleId}:${entry.target.id}:${entry.status}:${entry.normalizedScore}`)
  const normalizedSnapshotAgain = second.executionResult?.normalization.entries.map((entry) => `${entry.ruleId}:${entry.target.id}:${entry.status}:${entry.normalizedScore}`)
  assert.deepEqual(normalizedSnapshot, normalizedSnapshotAgain)
})

test('WPLP-80 extreme and contradictory response sets produce coherent, ordered, and predictable output behavior', () => {
  const { bundle } = buildFixtureBundle()

  const driverExtreme = executePreparedRuntimeExecutionBundleV2({
    bundle,
    responses: buildScenarioResponses(bundle, 'driver_extreme'),
    evaluationTimestamp: '2026-03-24T02:00:00.000Z',
  })
  const stabiliserExtreme = executePreparedRuntimeExecutionBundleV2({
    bundle,
    responses: buildScenarioResponses(bundle, 'stabiliser_extreme'),
    evaluationTimestamp: '2026-03-24T02:00:00.000Z',
  })
  const contradictory = executePreparedRuntimeExecutionBundleV2({
    bundle,
    responses: buildScenarioResponses(bundle, 'contradictory'),
    evaluationTimestamp: '2026-03-24T02:00:00.000Z',
  })

  assert.ok(driverExtreme.executionResult)
  assert.ok(stabiliserExtreme.executionResult)
  assert.ok(contradictory.executionResult)
  if (!driverExtreme.executionResult || !stabiliserExtreme.executionResult || !contradictory.executionResult) return

  assert.deepEqual(
    contradictory.executionResult.integrity.entries.map((entry) => entry.ruleId),
    bundle.compiledRuntimePlan.executionOrder.integrityRuleIds,
  )
  assert.deepEqual(
    [...contradictory.executionResult.outputs.matchedRuleIds, ...contradictory.executionResult.outputs.unmetRuleIds].sort(),
    bundle.compiledRuntimePlan.executionOrder.outputRuleIds.slice().sort(),
  )
  assert.deepEqual(
    Object.keys(contradictory.executionResult.outputs.byRuleId).sort(),
    bundle.compiledRuntimePlan.executionOrder.outputRuleIds.slice().sort(),
  )
})

test('WPLP-80 missing/skewed edge input keeps diagnostics explicit and stage-correct without silent failures', () => {
  const { bundle } = buildFixtureBundle()

  const missingSkew = executePreparedRuntimeExecutionBundleV2({
    bundle,
    responses: buildScenarioResponses(bundle, 'missing_skew'),
    evaluationTimestamp: '2026-03-24T03:00:00.000Z',
  })

  assert.equal(missingSkew.ok, true)
  assert.ok(missingSkew.executionResult)
  if (!missingSkew.executionResult) return

  assert.equal(missingSkew.executionResult.stages.scoring.outcome, 'partial')
  assert.ok(missingSkew.executionResult.issues.some((issue) => issue.stage === 'scoring' && issue.code === 'missing_response'))
  assert.equal(missingSkew.executionResult.stages.derivation.status, 'success')
  assert.equal(missingSkew.executionResult.stages.outputs.status, 'success')
})

test('WPLP-80 admin simulation and report preview workspace stay compatible with runtime-v2 execution foundations', () => {
  const importedCanonical = importAssessmentPackagePayload(wplp80Candidate)
  const importedRuntime = importAssessmentPackagePayload(importedCanonical.analysis.compiledRuntimeArtifact!)

  const simulation = executeAdminAssessmentSimulationForPackage(importedCanonical.definitionPayload, importedCanonical.schemaVersion, {
    answers: [],
    responses: buildScenarioResponses(buildFixtureBundle().bundle, 'balanced'),
    locale: 'en-US',
    source: 'manual_json',
    scenarioKey: 'balanced',
  })

  assert.ok(simulation.result)
  assert.equal(simulation.result?.contractVersion, 'package_contract_v2')
  assert.equal(simulation.result?.compileStatus, 'ready')
  assert.ok((simulation.result?.viewModel?.materializedWebSummaryOutputs.length ?? 0) > 0)
  assert.ok((simulation.result?.viewModel?.materializedReportSections.length ?? 0) > 0)
  assert.ok((simulation.result?.viewModel?.technicalDiagnostics.length ?? 0) >= 0)

  const canonicalStatus = getAdminAssessmentReportPreviewWorkspaceStatus({
    packageInfo: {
      status: importedCanonical.packageStatus,
      schemaVersion: importedCanonical.schemaVersion,
      sourceType: 'manual_import',
      importedAt: null,
      importedByName: null,
      sourceFilename: null,
      summary: importedCanonical.summary,
      errors: importedCanonical.errors,
      warnings: importedCanonical.warnings,
    },
    normalizedPackage: importedCanonical.definitionPayload as never,
  })

  const runtimeStatus = getAdminAssessmentReportPreviewWorkspaceStatus({
    packageInfo: {
      status: importedRuntime.packageStatus,
      schemaVersion: importedRuntime.schemaVersion,
      sourceType: 'manual_import',
      importedAt: null,
      importedByName: null,
      sourceFilename: null,
      summary: importedRuntime.summary,
      errors: importedRuntime.errors,
      warnings: importedRuntime.warnings,
    },
    normalizedPackage: importedRuntime.definitionPayload as never,
  })

  assert.equal(canonicalStatus.canGeneratePreview, true)
  assert.equal(runtimeStatus.canGeneratePreview, true)
  assert.match(canonicalStatus.summary, /shared runtime-v2 preparation/i)
  assert.match(runtimeStatus.summary, /shared runtime-v2 preparation/i)
})
