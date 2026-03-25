import assert from 'node:assert/strict'
import test from 'node:test'

import liteFixture from './fixtures/package-contract-v2-wplp80-lite.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { detectAssessmentPackageVersion, importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'

function cloneFixture() {
  return structuredClone(liteFixture)
}

test('WPLP-80 Lite fixture validates with expected compact package shape', () => {
  const result = validateSonartraAssessmentPackageV2(cloneFixture())

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  assert.equal(result.summary.questionCount, 16)
  assert.equal(result.summary.sectionCount, 4)
  assert.equal(result.summary.dimensionCount, 12)
  assert.equal(result.summary.responseModelCount, 4)
  assert.equal(result.summary.outputRuleCount, 4)
})

test('WPLP-80 Lite fixture is classified as canonical package contract v2 and remains importable', () => {
  const detected = detectAssessmentPackageVersion(cloneFixture())
  assert.equal(detected.detectedVersion, 'package_contract_v2')
  assert.equal(detected.classifier, 'canonical_contract_v2')
  assert.equal(detected.packageName, 'WPLP-80 Lite')
  assert.equal(detected.versionLabel, '2.0.0-lite.1')

  const imported = importAssessmentPackagePayload(cloneFixture())
  assert.equal(imported.validationSummary.success, true)
  assert.equal(imported.detectedVersion, 'package_contract_v2')
  assert.equal(imported.classifier, 'canonical_contract_v2')
  assert.equal(imported.readiness.importable, true)
  assert.equal(imported.readiness.compilable, true)
  assert.equal(imported.summary?.questionsCount, 16)
  assert.equal(imported.summary?.dimensionsCount, 12)
  assert.equal(imported.summary?.sectionCount, 4)
})

test('WPLP-80 Lite scoring structure is deterministic and single-select only', () => {
  const fixture = cloneFixture()
  const sectionToDimensionIds = new Map([
    ['behaviour-style', ['bs-driver', 'bs-analyst', 'bs-influencer']],
    ['motivators', ['mo-achievement', 'mo-mastery', 'mo-stability']],
    ['leadership', ['ld-results', 'ld-people', 'ld-process']],
    ['culture', ['cu-performance', 'cu-collaboration', 'cu-innovation']],
  ])

  assert.equal(fixture.questions.length, 16)

  for (const question of fixture.questions) {
    const sectionId = question.sectionIds?.[0]
    assert.ok(sectionId)

    const expectedDimensions = sectionToDimensionIds.get(sectionId!)
    assert.ok(expectedDimensions)

    const responseModel = fixture.responseModels.models.find((model) => model.id === question.responseModelId)
    assert.ok(responseModel)
    assert.equal(responseModel!.type, 'single_select')
    assert.equal(responseModel!.options?.length, 4)

    const scoringDimensionIds = (question.scoring ?? []).map((entry) => entry.dimensionId)
    assert.equal(scoringDimensionIds.length, 3)
    assert.deepEqual(scoringDimensionIds.sort(), [...expectedDimensions!].sort())

    for (const option of responseModel!.options ?? []) {
      const mappedDimensions = Object.keys(option.scoreMap ?? {})
      assert.ok(mappedDimensions.length >= 1)
      assert.ok(mappedDimensions.every((dimensionId) => expectedDimensions!.includes(dimensionId)))
    }
  }
})
