import assert from 'node:assert/strict'
import test from 'node:test'

import examplePackage from './fixtures/package-contract-v2-example.json'
import { validateSonartraAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2'
import { compileAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-compiler'
import { evaluateAssessmentPackageV2 } from '../lib/admin/domain/assessment-package-v2-evaluator'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'

function compileFixture(mutator?: (pkg: ReturnType<typeof getValidatedFixture>) => void) {
  const pkg = getValidatedFixture()
  mutator?.(pkg)
  const compiled = compileAssessmentPackageV2(pkg)
  assert.equal(compiled.ok, true)
  assert.ok(compiled.executablePackage)
  return compiled.executablePackage!
}

function getValidatedFixture() {
  const validation = validateSonartraAssessmentPackageV2(examplePackage)
  assert.equal(validation.ok, true)
  return structuredClone(validation.normalizedPackage!)
}

test('compiled v2 packages evaluate valid responses into raw, derived, normalized, integrity, and output results', () => {
  const executable = compileFixture()
  const result = evaluateAssessmentPackageV2(executable, {
    q1: 'often',
    q2: 'rarely',
    q3: 'often',
    q4: 'often',
  })

  assert.equal(result.status, 'success')
  assert.equal(result.rawDimensions.stability.rawScore, 4)
  assert.equal(result.rawDimensions.adaptability.rawScore, 4)
  assert.equal(result.derivedDimensions['adaptive-balance'].rawScore, 4.25)
  assert.equal(result.normalizedResults[0]?.band, 'high')
  assert.equal(result.integrityFindings.find((finding) => finding.ruleId === 'stability-contradiction')?.status, 'not_triggered')
  assert.equal(result.outputRuleFindings.find((finding) => finding.ruleId === 'adaptive-balance-summary')?.status, 'triggered')
})

test('reverse-scored and weighted item transforms affect raw dimension totals deterministically', () => {
  const executable = compileFixture((pkg) => {
    pkg.scoring.transforms.push({
      id: 'weight-q3',
      kind: 'weight_multiplier',
      target: { level: 'item', questionId: 'q3' },
      config: { multiplier: 2 },
    })
    pkg.questions.find((question) => question.id === 'q3')?.scoring?.[0]?.transformIds?.push('weight-q3')
  })

  const result = evaluateAssessmentPackageV2(executable, {
    q1: 'often',
    q2: 'rarely',
    q3: 'sometimes',
    q4: 'often',
  })

  assert.equal(result.rawDimensions.stability.rawScore, 4)
  assert.equal(result.rawDimensions.adaptability.rawScore, 5)
  assert.equal(result.itemResults.find((item) => item.questionId === 'q2' && item.dimensionId === 'stability')?.effectiveScore, 4)
  assert.equal(result.itemResults.find((item) => item.questionId === 'q3' && item.dimensionId === 'adaptability')?.effectiveScore, 6)
})

test('derived dimensions execute in dependency order and apply compiled derived-dimension rules', () => {
  const executable = compileFixture((pkg) => {
    pkg.derivedDimensions = [
      ...pkg.derivedDimensions,
      {
        id: 'adaptive-balance-plus',
        label: 'Adaptive Balance Plus',
        computation: {
          method: 'formula',
          formula: 'adaptive-balance + stability',
          sourceDimensionIds: ['stability'],
        },
      },
    ]
    pkg.normalization.rules = []
  })

  const result = evaluateAssessmentPackageV2(executable, {
    q1: 'often',
    q2: 'rarely',
    q3: 'often',
    q4: 'often',
  })

  assert.deepEqual(executable.executionPlan.derivedDimensionIds, ['adaptive-balance', 'adaptive-balance-plus'])
  assert.equal(result.derivedDimensions['adaptive-balance'].rawScore, 4.25)
  assert.equal(result.derivedDimensions['adaptive-balance-plus'].rawScore, 8.25)
})

test('missing-data policies surface insufficient data explicitly', () => {
  const executable = compileFixture()
  const result = evaluateAssessmentPackageV2(executable, {
    q1: 'often',
    q3: 'often',
    q4: 'often',
  })

  assert.equal(result.status, 'completed_with_warnings')
  assert.equal(result.rawDimensions.stability.status, 'insufficient_data')
  assert.equal(result.rawDimensions.stability.rawScore, null)
  assert.ok(result.warnings.some((diagnostic) => diagnostic.code === 'minimum_answer_threshold_not_met'))
  assert.equal(result.derivedDimensions['adaptive-balance'].status, 'missing_dependencies')
})

test('incompatible response values produce useful diagnostics without coercion', () => {
  const executable = compileFixture()
  const result = evaluateAssessmentPackageV2(executable, {
    q1: 5,
    q2: 'rarely',
    q3: 'often',
    q4: 'often',
  })

  assert.equal(result.status, 'failed')
  assert.equal(result.boundResponses.q1.status, 'invalid')
  assert.ok(result.responseDiagnostics.some((diagnostic) => diagnostic.code === 'invalid_option_response' && diagnostic.path === 'responses.q1'))
})

test('integrity and output rules can trigger off evaluated scores and integrity flags', () => {
  const executable = compileFixture()
  const result = evaluateAssessmentPackageV2(executable, {
    q1: 'always',
    q2: 'always',
    q3: 'often',
    q4: 'often',
  })

  assert.equal(result.integrityFindings.find((finding) => finding.ruleId === 'stability-contradiction')?.status, 'triggered')
  assert.equal(result.outputRuleFindings.find((finding) => finding.ruleId === 'integrity-warning')?.status, 'triggered')
})

test('evaluation result contract stays traceable and readiness reflects evaluatable versus merely compilable', () => {
  const executable = compileFixture()
  const result = evaluateAssessmentPackageV2(executable, {
    q1: 'often',
    q2: 'rarely',
    q3: 'often',
    q4: 'often',
  })
  const importableOnly = importAssessmentPackagePayload({
    ...examplePackage,
    report: {
      content: [
        ...examplePackage.report.content,
        {
          key: 'orphan-content',
          label: 'Orphan Content',
          contentRef: 'report.orphan',
        },
      ],
    },
  })
  const evaluatable = importAssessmentPackagePayload(examplePackage)

  assert.deepEqual(Object.keys(result.executionMetadata), [
    'evaluationId',
    'runtimeVersion',
    'packageKey',
    'packageSemver',
    'questionCount',
    'rawDimensionCount',
    'derivedDimensionCount',
  ])
  assert.ok(result.itemResults.every((item) => Array.isArray(item.transformApplications) && Array.isArray(item.ruleApplications)))
  assert.equal(importableOnly.readiness.compilable, false)
  assert.equal(importableOnly.readiness.evaluatable, false)
  assert.equal(evaluatable.readiness.compilable, true)
  assert.equal(evaluatable.readiness.evaluatable, true)
  assert.equal(evaluatable.readiness.runtimeExecutable, false)
})
