import assert from 'node:assert/strict'
import test from 'node:test'
import { isSonartraAssessmentPackageV2, type SonartraAssessmentPackageV2 } from '../lib/contracts/package-contract-v2'
import { validatePackageV2 } from '../lib/server/package-validator-v2'

function buildMinimalPackage(): SonartraAssessmentPackageV2 {
  return {
    metadata: {
      definitionId: 'demo-assessment',
      version: '1.0.0',
      title: 'Demo Assessment',
    },
    questionSets: [{ id: 'qs-1', title: 'Section A', order: 1 }],
    questions: [{ id: 'q-1', questionSetId: 'qs-1', text: 'Question 1', order: 1 }],
    options: [{ id: 'o-1', questionId: 'q-1', text: 'Option 1', order: 1 }],
    signalMappings: [{ optionId: 'o-1', signalKey: 'signal.alpha', weight: 1, domain: 'readiness' }],
    scoring: { method: 'weighted_sum' },
    normalization: { method: 'percentage_distribution', enforceTotal: 100 },
    output: { generateRankings: true, generateDomainSummaries: true, generateOverview: true },
  }
}

test('valid minimal package passes structural guard and validation', () => {
  const pkg = buildMinimalPackage()
  assert.equal(isSonartraAssessmentPackageV2(pkg), true)

  const result = validatePackageV2(pkg)
  assert.equal(result.valid, true)
  assert.deepEqual(result.errors, [])
  assert.equal(result.normalized?.questions.length, 1)
})

test('validation fails when question foreign key is missing', () => {
  const pkg = buildMinimalPackage()
  const result = validatePackageV2({
    ...pkg,
    questions: [{ id: 'q-1', questionSetId: 'missing-set', text: 'Question 1', order: 1 }],
  })

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => /unknown questionSetId/i.test(error)))
})

test('validation fails when options are missing mappings', () => {
  const pkg = buildMinimalPackage()
  const result = validatePackageV2({
    ...pkg,
    signalMappings: [],
  })

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => /must have at least one signal mapping/i.test(error)))
})

test('validation fails for duplicate ids', () => {
  const pkg = buildMinimalPackage()
  const result = validatePackageV2({
    ...pkg,
    questions: [
      ...pkg.questions,
      { id: 'q-1', questionSetId: 'qs-1', text: 'Duplicate Question', order: 2 },
    ],
  })

  assert.equal(result.valid, false)
  assert.ok(result.errors.some((error) => /duplicate question id/i.test(error)))
})
