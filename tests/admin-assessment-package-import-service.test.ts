import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { normalizeAdminAssessmentPackageImportState } from '../lib/admin/domain/assessment-management'
import { importAssessmentPackagePayload, detectAssessmentPackageVersion } from '../lib/admin/server/assessment-package-import'

test('v2 package detection identifies Package Contract v2 payloads', () => {
  const detected = detectAssessmentPackageVersion(examplePackage)

  assert.equal(detected.detectedVersion, 'package_contract_v2')
  assert.equal(detected.schemaVersion, 'sonartra-assessment-package/v2')
  assert.equal(detected.packageName, 'Adaptive Workstyle Sample')
  assert.equal(detected.versionLabel, '2.0.0')
})

test('valid v2 package import artifact produces admin-compatible summary and readiness flags', () => {
  const result = importAssessmentPackagePayload(examplePackage)

  assert.equal(result.validationSummary.success, true)
  assert.equal(result.detectedVersion, 'package_contract_v2')
  assert.equal(result.summary?.questionsCount, 4)
  assert.equal(result.summary?.dimensionsCount, 2)
  assert.equal(result.summary?.sectionCount, 2)
  assert.equal(result.summary?.derivedDimensionCount, 1)
  assert.equal(result.summary?.packageName, 'Adaptive Workstyle Sample')
  assert.equal(result.readiness.importable, true)
  assert.equal(result.readiness.runtimeExecutable, false)
  assert.equal(result.readiness.publishable, false)
})

test('malformed v2 package returns normalized validation errors', () => {
  const result = importAssessmentPackagePayload({
    ...examplePackage,
    questions: [],
    sections: [],
  })

  assert.equal(result.validationSummary.success, false)
  assert.equal(result.packageStatus, 'invalid')
  assert.ok(result.errors.some((issue) => issue.path === 'questions'))
  assert.ok(result.errors.some((issue) => issue.path === 'sections'))
})

test('unknown package version fails safely with useful messaging', () => {
  const result = importAssessmentPackagePayload({
    schemaVersion: 'sonartra-assessment-package/v9',
    metadata: { assessmentName: 'Broken package' },
  })

  assert.equal(result.validationSummary.success, false)
  assert.equal(result.detectedVersion, 'unknown')
  assert.match(result.errors[0]?.message ?? '', /unknown or unsupported package contract version/i)
})

test('client-facing import payload normalization remains safe when optional metadata is absent', () => {
  const state = normalizeAdminAssessmentPackageImportState({
    status: 'error',
    message: 'Import failed.',
    validationResult: {
      success: false,
      detectedVersion: 'package_contract_v2',
      schemaVersion: 'sonartra-assessment-package/v2',
      packageName: undefined as never,
      versionLabel: undefined as never,
      summary: null,
      readiness: undefined as never,
      errors: [{ path: 'questions', message: 'At least one question is required.' }],
      warnings: undefined as never,
    },
  })

  assert.equal(state.validationResult?.detectedVersion, 'package_contract_v2')
  assert.equal(state.validationResult?.packageName, null)
  assert.equal(state.validationResult?.versionLabel, null)
  assert.deepEqual(state.validationResult?.errors, [{ path: 'questions', message: 'At least one question is required.' }])
  assert.deepEqual(state.validationResult?.warnings, [])
})
