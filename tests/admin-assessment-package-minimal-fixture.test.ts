import assert from 'node:assert/strict'
import test from 'node:test'

import minimalPackage from './fixtures/admin-import-minimal-package-contract-v2.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'
import { detectAssessmentPackageVersion, importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'

test('minimal admin import fixture is detected, validated, and compiled as Package Contract v2', () => {
  const detected = detectAssessmentPackageVersion(minimalPackage)
  assert.equal(detected.detectedVersion, 'package_contract_v2')
  assert.equal(detected.schemaVersion, 'sonartra-assessment-package/v2')
  assert.equal(detected.packageName, 'Admin Import Minimal')
  assert.equal(detected.versionLabel, '0.0.1')

  const validation = validateSonartraAssessmentPackageV2(minimalPackage)
  assert.equal(validation.ok, true)
  assert.equal(validation.errors.length, 0)
  assert.equal(validation.summary.questionCount, 1)
  assert.equal(validation.summary.sectionCount, 1)
  assert.equal(validation.summary.dimensionCount, 1)
  assert.equal(validation.summary.responseModelCount, 1)

  const compiled = compileAssessmentPackageV2(validation.normalizedPackage!)
  assert.equal(compiled.ok, true)

  const imported = importAssessmentPackagePayload(minimalPackage)
  assert.equal(imported.validationSummary.success, true)
  assert.equal(imported.detectedVersion, 'package_contract_v2')
  assert.equal(imported.summary?.questionsCount, 1)
  assert.equal(imported.summary?.dimensionsCount, 1)
  assert.equal(imported.summary?.sectionCount, 1)
  assert.equal(imported.summary?.responseModelCount, 1)
  assert.equal(imported.readiness.importable, true)
  assert.equal(imported.readiness.compilable, true)
})
