import assert from 'node:assert/strict'
import test from 'node:test'

import canonicalFixture from './fixtures/package-contract-v2-wplp80-foundation.json'
import { SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2, validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { detectAssessmentPackageVersion } from '../lib/admin/server/assessment-package-import'

function cloneFixture() {
  return structuredClone(canonicalFixture)
}

test('canonical WPLP-80-style v2 package parses successfully', () => {
  const result = validateSonartraAssessmentPackageV2(cloneFixture())

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  assert.equal(result.normalizedPackage?.schemaVersion, SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2)
  assert.equal(result.summary.questionCount, 6)
  assert.equal(result.summary.sectionCount, 3)
  assert.equal(result.summary.dimensionCount, 4)
  assert.equal(result.summary.derivedDimensionCount, 1)
  assert.equal(result.summary.normalizationRuleCount, 2)
  assert.equal(result.summary.integrityRuleCount, 1)
  assert.equal(result.summary.outputRuleCount, 2)
  assert.equal(result.normalizedPackage?.metadata.assessmentKey, 'wplp80-foundation-sample')
  assert.equal(result.normalizedPackage?.questions[0]?.responseModelId, 'q1__single_select')
})

test('canonical v2 package fails when required identity fields are missing', () => {
  const missingTitle = cloneFixture()
  delete missingTitle.identity.title

  const missingTitleResult = validateSonartraAssessmentPackageV2(missingTitle)

  assert.equal(missingTitleResult.ok, false)
  assert.ok(missingTitleResult.errors.some((issue) => issue.path === 'metadata.assessmentName'))

  const missingLanguages = cloneFixture()
  missingLanguages.identity.supportedLanguages.supportedLanguages = []

  const missingLanguagesResult = validateSonartraAssessmentPackageV2(missingLanguages)

  assert.equal(missingLanguagesResult.ok, false)
  assert.ok(missingLanguagesResult.errors.some((issue) => issue.path === 'metadata.locales.supportedLocales'))
})

test('canonical v2 package rejects duplicate ids and keys', () => {
  const fixture = cloneFixture()
  fixture.structure.sections.push({ ...fixture.structure.sections[0] })
  fixture.dimensionCatalog.dimensions.push({ ...fixture.dimensionCatalog.dimensions[0] })

  const result = validateSonartraAssessmentPackageV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => /Duplicate section id/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /Duplicate dimension key/i.test(issue.message)))
})

test('canonical v2 package rejects invalid dimension references in scoring and aggregation metadata', () => {
  const fixture = cloneFixture()
  fixture.scoring.optionMappings[0].targets[0].dimensionKey = 'missing-dimension'
  fixture.aggregation.comparableGroups[0].dimensionKeys = ['missing-dimension']

  const result = validateSonartraAssessmentPackageV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path.includes('scoring.optionMappings[0].targets[0].dimensionKey')))
  assert.ok(result.errors.some((issue) => issue.path.includes('aggregation.comparableGroups[0].dimensionKeys')))
})

test('canonical v2 package rejects malformed scoring declarations', () => {
  const fixture = cloneFixture()
  fixture.scoring.optionMappings[0].targets = [{ dimensionKey: 'pace_drive', weight: 'heavy' as never }]
  fixture.scoring.optionMappings.push({ ...fixture.scoring.optionMappings[0] })

  const result = validateSonartraAssessmentPackageV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path.includes('.weight')))
  assert.ok(result.errors.some((issue) => /Duplicate scoring mapping/i.test(issue.message)))
})

test('canonical v2 package validates derived dimension declaration shape', () => {
  const result = validateSonartraAssessmentPackageV2(cloneFixture())

  assert.equal(result.ok, true)
  assert.deepEqual(result.normalizedPackage?.derivedDimensions[0]?.computation.sourceDimensionIds, ['pace_drive', 'structure_anchor', 'adaptive_judgement'])
  assert.match(result.normalizedPackage?.derivedDimensions[0]?.computation.formula ?? '', /adaptive_judgement \* 2/)
})

test('canonical v2 package validates integrity and output declaration shapes', () => {
  const result = validateSonartraAssessmentPackageV2(cloneFixture())

  assert.equal(result.ok, true)
  assert.equal(result.normalizedPackage?.integrity.rules[0]?.kind, 'contradiction')
  assert.equal(result.normalizedPackage?.outputs.rules[0]?.metadata?.narrativeKey, 'operating-flexibility-summary')
})

test('canonical v2 package rejects broken normalization metadata', () => {
  const fixture = cloneFixture()
  fixture.normalization.groups[0].comparisonOrder = ['missing-dimension']

  const result = validateSonartraAssessmentPackageV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path.includes('normalization.groups[0].comparisonOrder')))
})

test('canonical v2 package rejects broken output declarations', () => {
  const fixture = cloneFixture()
  fixture.outputs.blocks[0].reportBindingKey = 'missing-report-binding'

  const result = validateSonartraAssessmentPackageV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path.includes('outputs.blocks[0].reportBindingKey')))
})

test('canonical v2 package rejects broken aggregation metadata', () => {
  const fixture = cloneFixture()
  fixture.aggregation.rollupHints[0].comparableGroupId = 'missing-comparable-group'

  const result = validateSonartraAssessmentPackageV2(fixture)

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path.includes('aggregation.rollupHints[0].comparableGroupId')))
})

test('legacy and canonical package paths stay clearly separated', () => {
  const legacyLike = {
    meta: {
      schemaVersion: 'sonartra-assessment-package/v1',
      assessmentKey: 'legacy-sample',
      assessmentTitle: 'Legacy Sample',
      defaultLocale: 'en-US',
    },
  }

  const canonicalDetected = detectAssessmentPackageVersion(cloneFixture())
  const legacyDetected = detectAssessmentPackageVersion(legacyLike)

  assert.equal(canonicalDetected.detectedVersion, 'package_contract_v2')
  assert.equal(canonicalDetected.packageName, 'WPLP-80 Foundation Sample')
  assert.equal(canonicalDetected.versionLabel, '2.0.0-wplp-foundation')
  assert.equal(legacyDetected.detectedVersion, 'legacy_v1')
})
