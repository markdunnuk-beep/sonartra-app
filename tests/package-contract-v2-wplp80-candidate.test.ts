import assert from 'node:assert/strict'
import test from 'node:test'

import candidateFixture from './fixtures/package-contract-v2-wplp80-canonical-candidate.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { importAssessmentPackagePayload, detectAssessmentPackageVersion } from '../lib/admin/server/assessment-package-import'

function cloneFixture() {
  return structuredClone(candidateFixture)
}

test('full WPLP-80 canonical candidate validates as package contract v2', () => {
  const result = validateSonartraAssessmentPackageV2(cloneFixture())

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  assert.equal(result.summary.questionCount, 80)
  assert.equal(result.summary.sectionCount, 11)
  assert.equal(result.summary.dimensionCount, 45)
  assert.equal(result.summary.derivedDimensionCount, 13)
  assert.equal(result.summary.integrityRuleCount, 2)
  assert.equal(result.summary.outputRuleCount, 3)
  assert.equal(result.summary.transformCount, 9)
  assert.equal(result.normalizedPackage?.metadata.assessmentKey, 'wplp80-canonical-candidate')
})

test('full WPLP-80 canonical candidate is classified through canonical v2 path', () => {
  const detected = detectAssessmentPackageVersion(cloneFixture())

  assert.equal(detected.detectedVersion, 'package_contract_v2')
  assert.equal(detected.classifier, 'canonical_contract_v2')
  assert.equal(detected.packageName, 'WPLP-80 Workplace Pattern & Leadership Profile')
  assert.equal(detected.versionLabel, '2.0.0-wplp80-candidate.1')
})

test('full WPLP-80 canonical candidate survives import analysis, canonical→runtime compilation, and runtime-plan compilation', () => {
  const imported = importAssessmentPackagePayload(cloneFixture())

  assert.equal(imported.detectedVersion, 'package_contract_v2')
  assert.equal(imported.classifier, 'canonical_contract_v2')
  assert.equal(imported.packageStatus, 'valid_with_warnings')
  assert.equal(imported.validationSummary.success, true)

  assert.equal(imported.analysis.structurallyValid, true)
  assert.equal(imported.analysis.importable, true)
  assert.equal(imported.analysis.compileRequired, true)
  assert.equal(imported.analysis.compilePerformed, true)
  assert.equal(imported.analysis.compiledRuntimeArtifactProduced, true)
  assert.equal(imported.analysis.compiledRuntimePlanProduced, true)
  assert.equal(imported.analysis.readinessState.milestone, 'preview_simulation_ready')

  assert.equal(imported.analysis.diagnostics.canonicalValidation.length, 1)
  assert.equal(imported.analysis.diagnostics.runtimeValidation.length, 0)
  assert.equal(imported.analysis.diagnostics.planCompilation?.length, 0)
  assert.equal(imported.analysis.diagnosticsByBoundary.validation.length, 1)
  assert.equal(imported.analysis.diagnosticsByBoundary.compiler.length, 4)

  const canonicalWarningMessages = imported.analysis.diagnostics.canonicalValidation.map((issue) => issue.message)
  assert.ok(canonicalWarningMessages.some((message) => /metadata-only/i.test(message)))

  const compilationWarningMessages = imported.analysis.diagnostics.compilation.map((issue) => issue.message)
  assert.ok(compilationWarningMessages.some((message) => /response-pattern primitives are not yet first-class/i.test(message)))
  assert.equal(compilationWarningMessages.filter((message) => /\[missing_report_content_ref\]/.test(message)).length, 3)
})
