import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { evaluateAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-evaluator'
import {
  compiledRuntimeCache,
  createPackageRuntimeFingerprint,
  getOrCompileRuntime,
} from '../lib/admin/domain/assessment-package-v2-performance-server'
import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'

function getValidatedFixture() {
  const validation = validateSonartraAssessmentPackageV2(examplePackage)
  assert.equal(validation.ok, true)
  return validation.normalizedPackage!
}

test('unchanged package reuses compiled runtime cache while changed packages invalidate it deterministically', () => {
  compiledRuntimeCache.clear()
  const pkg = getValidatedFixture()

  const first = getOrCompileRuntime(pkg, { assessmentVersionId: 'version-1' })
  const second = getOrCompileRuntime(pkg, { assessmentVersionId: 'version-1' })

  assert.equal(first.ok, true)
  assert.equal(first.cache.hit, false)
  assert.equal(second.ok, true)
  assert.equal(second.cache.hit, true)
  assert.equal(second.cache.fingerprint.cacheKey, first.cache.fingerprint.cacheKey)

  const changed = structuredClone(pkg)
  changed.metadata.assessmentName = 'Adaptive Balance Extended'
  const third = getOrCompileRuntime(changed, { assessmentVersionId: 'version-1' })

  assert.equal(third.ok, true)
  assert.equal(third.cache.hit, false)
  assert.notEqual(third.cache.fingerprint.packageFingerprint, first.cache.fingerprint.packageFingerprint)
})

test('corrupted compile cache entries fall back to a fresh compile safely', () => {
  compiledRuntimeCache.clear()
  const pkg = getValidatedFixture()
  const fingerprint = createPackageRuntimeFingerprint(pkg, { assessmentVersionId: 'version-1' })
  compiledRuntimeCache.corrupt(fingerprint.cacheKey, { broken: true })

  const compiled = getOrCompileRuntime(pkg, { assessmentVersionId: 'version-1' })

  assert.equal(compiled.ok, true)
  assert.equal(compiled.cache.hit, false)
  assert.ok(compiled.executablePackage)
})

test('large or runaway assessments surface explicit safeguards instead of running indefinitely', () => {
  const largePackage = structuredClone(getValidatedFixture())
  for (let index = 0; index < 81; index += 1) {
    largePackage.dimensions.push({
      id: `extra-dimension-${index}`,
      label: `Extra Dimension ${index}`,
      scoringMethod: 'average',
      inputQuestionIds: ['q1'],
      weightedQuestions: [],
      missingDataPolicy: 'skip',
      minimumAnswered: 1,
    })
  }

  const compiled = compileAssessmentPackageV2(largePackage)
  assert.equal(compiled.ok, true)
  assert.ok(compiled.diagnostics.some((diagnostic) => diagnostic.code === 'large_assessment_dimension_count'))

  const safeEvaluation = evaluateAssessmentPackageV2(compiled.executablePackage!, {
    q1: 'often',
    q2: 'rarely',
    q3: 'often',
    q4: 'often',
  }, {
    maxPredicateEvaluations: 1,
  })

  assert.equal(safeEvaluation.status, 'failed')
  assert.ok(safeEvaluation.errors.some((diagnostic) => diagnostic.code === 'predicate_evaluation_budget_exceeded'))
})
