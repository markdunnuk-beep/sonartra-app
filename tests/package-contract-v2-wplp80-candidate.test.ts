import assert from 'node:assert/strict'
import test from 'node:test'

import candidateFixture from './fixtures/package-contract-v2-wplp80-canonical-candidate.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { detectAssessmentPackageVersion } from '../lib/admin/server/assessment-package-import'

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
