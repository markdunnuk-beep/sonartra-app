import assert from 'node:assert/strict'
import test from 'node:test'

import canonicalFixture from './fixtures/package-contract-v2-wplp80-foundation.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import {
  compileCanonicalToRuntimeContractV2,
  SONARTRA_EXECUTABLE_RUNTIME_PACKAGE_V2_SCHEMA,
  validateRuntimeContractV2,
} from '../lib/admin/domain/package-runtime-v2'
import { detectAssessmentPackageVersion } from '../lib/admin/server/assessment-package-import'

function cloneCanonicalFixture() {
  return structuredClone(canonicalFixture)
}

function buildRuntimeFixture() {
  const compiled = compileCanonicalToRuntimeContractV2(cloneCanonicalFixture())
  assert.equal(compiled.ok, true)
  assert.ok(compiled.runtimePackage)
  return compiled.runtimePackage
}

test('canonical v2 converts to executable runtime v2', () => {
  const result = compileCanonicalToRuntimeContractV2(cloneCanonicalFixture())

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  assert.equal(result.runtimePackage?.contractKind, 'runtime_v2')
  assert.equal(result.runtimePackage?.metadata.runtimeSchemaVersion, SONARTRA_EXECUTABLE_RUNTIME_PACKAGE_V2_SCHEMA)
  assert.equal(result.runtimePackage?.itemBank.sections.length, 3)
  assert.equal(result.runtimePackage?.itemBank.questions.length, 6)
  assert.equal(result.runtimePackage?.dimensions.raw.length, 4)
  assert.equal(result.runtimePackage?.dimensions.derived.length, 1)
  assert.equal(result.runtimePackage?.scoring.instructions.length, 30)
})

test('runtime v2 package parses and validates successfully', () => {
  const fixture = buildRuntimeFixture()
  const result = validateRuntimeContractV2(fixture)

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
})

test('runtime v2 rejects duplicate ids', () => {
  const fixture = buildRuntimeFixture()
  fixture.itemBank.sections.push({ ...fixture.itemBank.sections[0] })
  fixture.itemBank.questions.push({ ...fixture.itemBank.questions[0] })

  const result = validateRuntimeContractV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => /Duplicate section id/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /Duplicate question id/i.test(issue.message)))
})

test('runtime v2 rejects invalid dimension and scoring references', () => {
  const fixture = buildRuntimeFixture()
  fixture.dimensions.groups[0].dimensionIds = ['missing-dimension']
  fixture.scoring.instructions[0].contributions[0].dimensionId = 'missing-dimension'
  fixture.scoring.instructions[0].questionId = 'missing-question'

  const result = validateRuntimeContractV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path.includes('dimensions.groups[0].dimensionIds')))
  assert.ok(result.errors.some((issue) => issue.path.includes('scoring.instructions[0].contributions[0].dimensionId')))
  assert.ok(result.errors.some((issue) => issue.path.includes('scoring.instructions[0].questionId')))
})

test('runtime v2 rejects malformed derived and normalization declarations', () => {
  const fixture = buildRuntimeFixture()
  fixture.dimensions.derived[0].method = 'unknown' as never
  fixture.dimensions.derived[0].inputs = [{ dimensionId: 'missing-dimension', weight: Number.NaN }]
  fixture.normalization.rules[0].appliesTo.dimensionIds = ['missing-dimension']
  fixture.normalization.rules[0].appliesTo.derivedDimensionIds = ['missing-derived']

  const result = validateRuntimeContractV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path.includes('dimensions.derived[0].method')))
  assert.ok(result.errors.some((issue) => issue.path.includes('dimensions.derived[0].inputs[0].dimensionId')))
  assert.ok(result.errors.some((issue) => issue.path.includes('dimensions.derived[0].inputs[0].weight')))
  assert.ok(result.errors.some((issue) => issue.path.includes('normalization.rules[0].appliesTo.dimensionIds')))
  assert.ok(result.errors.some((issue) => issue.path.includes('normalization.rules[0].appliesTo.derivedDimensionIds')))
})

test('runtime v2 rejects malformed output declarations', () => {
  const fixture = buildRuntimeFixture()
  fixture.outputs.reportBindings = []
  fixture.outputs.rules[0].metadata = { narrativeKey: 'x', targetReportKey: 'missing-binding' }
  fixture.outputs.rules[0].affectedDerivedDimensionIds = ['missing-derived']

  const result = validateRuntimeContractV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path.includes('outputs.rules[0].metadata.targetReportKey')))
  assert.ok(result.errors.some((issue) => issue.path.includes('outputs.rules[0].affectedDerivedDimensionIds')))
})

test('canonical and runtime contracts are detected as distinct package versions', () => {
  const canonicalDetected = detectAssessmentPackageVersion(cloneCanonicalFixture())
  const runtimeDetected = detectAssessmentPackageVersion(buildRuntimeFixture())

  assert.equal(canonicalDetected.detectedVersion, 'package_contract_v2')
  assert.equal(runtimeDetected.detectedVersion, 'runtime_contract_v2')
})

test('runtime package is not treated as authoring package payload', () => {
  const runtimeFixture = buildRuntimeFixture()

  const authoringResult = validateSonartraAssessmentPackageV2(runtimeFixture)

  assert.equal(authoringResult.ok, false)
  assert.ok(authoringResult.errors.some((issue) => issue.path === 'schemaVersion'))
})
