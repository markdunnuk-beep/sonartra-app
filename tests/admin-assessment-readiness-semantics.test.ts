import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { importAssessmentPackagePayload, extractAssessmentPackageIdentity } from '../lib/admin/server/assessment-package-import'
import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'


test('readiness state milestones are coherent for canonical and runtime v2 payloads', () => {
  const canonical = importAssessmentPackagePayload(examplePackage)
  assert.equal(canonical.analysis.readinessState.milestone, 'preview_simulation_ready')
  assert.equal(canonical.analysis.readinessState.capabilities.adminExecutable, true)
  assert.equal(canonical.analysis.readinessState.capabilities.liveRuntimeSupported, false)

  const validated = validateSonartraAssessmentPackageV2(examplePackage)
  assert.equal(validated.ok, true)
  const compiled = compileAssessmentPackageV2(validated.normalizedPackage!)
  assert.equal(compiled.ok, true)

  const runtime = importAssessmentPackagePayload(compiled.executablePackage)
  assert.equal(runtime.analysis.readinessState.milestone, 'live_runtime_supported')
  assert.equal(runtime.analysis.readinessState.capabilities.adminExecutable, true)
  assert.equal(runtime.analysis.readinessState.capabilities.liveRuntimeSupported, true)
})

test('identity extraction branching uses classifier semantics rather than detectedVersion labels', () => {
  const canonical = importAssessmentPackagePayload(examplePackage)
  const extracted = extractAssessmentPackageIdentity(examplePackage, canonical)
  assert.equal(canonical.detectedVersion, 'package_contract_v2')
  assert.equal(canonical.classifier, 'canonical_contract_v2')
  assert.equal(extracted.identity?.assessmentKey, 'adaptive-workstyle')
})

test('import diagnostics are partitioned by validation/compiler/execution boundaries', () => {
  const malformed = importAssessmentPackagePayload({ ...examplePackage, sections: [] })
  assert.ok(malformed.analysis.diagnosticsByBoundary.validation.length > 0)
  assert.equal(malformed.analysis.diagnosticsByBoundary.compiler.length, 0)
  assert.equal(malformed.analysis.diagnosticsByBoundary.execution.length, 0)
})
