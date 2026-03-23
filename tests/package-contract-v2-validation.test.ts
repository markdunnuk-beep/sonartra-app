import assert from 'node:assert/strict'
import test from 'node:test'
import examplePackage from './fixtures/package-contract-v2-example.json'
import {
  SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
  validateSonartraAssessmentPackageV2,
} from '../lib/admin/domain/assessment-package-v2'
import { compileAssessmentPackageV2, EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION } from '../lib/admin/domain/assessment-package-v2-compiler'

test('Package Contract v2 accepts the example package fixture', () => {
  const result = validateSonartraAssessmentPackageV2(examplePackage)

  assert.equal(result.ok, true)
  assert.equal(result.errors.length, 0)
  assert.equal(result.normalizedPackage?.schemaVersion, SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2)
  assert.equal(result.summary.questionCount, 4)
  assert.equal(result.summary.sectionCount, 2)
  assert.equal(result.summary.dimensionCount, 2)
  assert.equal(result.summary.derivedDimensionCount, 1)
  assert.equal(result.summary.integrityRuleCount, 1)
  assert.equal(result.summary.outputRuleCount, 2)
})

test('Package Contract v2 rejects malformed references with useful errors', () => {
  const result = validateSonartraAssessmentPackageV2({
    ...examplePackage,
    questions: [
      ...examplePackage.questions,
      {
        id: 'q1',
        code: 'AWS-99',
        prompt: 'Broken duplicate question.',
        responseModelId: 'missing-model',
        sectionIds: ['missing-section'],
      },
    ],
    dimensions: [
      ...examplePackage.dimensions,
      {
        id: 'stability',
        label: 'Duplicate Stability',
        scoringMethod: 'average',
        inputQuestionIds: ['missing-question'],
      },
    ],
    outputs: {
      rules: [
        ...examplePackage.outputs.rules,
        {
          id: 'broken-output',
          key: 'broken-output',
          type: 'summary',
          predicate: {
            type: 'comparison',
            operator: 'gte',
            left: { type: 'derived_dimension_score', derivedDimensionId: 'missing-derived' },
            right: { type: 'constant', value: 1 },
          },
          metadata: {
            label: 'Broken output',
            narrativeKey: 'missing-report-content',
          },
        },
      ],
    },
  })

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => /Duplicate question id/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /Unknown response model reference/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /Unknown section reference/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /Duplicate dimension id/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /Unknown question reference/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /Unknown derived dimension reference/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /Unknown report content reference/i.test(issue.message)))
})

test('Package Contract v2 rejects missing required structural blocks', () => {
  const result = validateSonartraAssessmentPackageV2({
    packageVersion: '2',
    schemaVersion: SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
    metadata: {
      assessmentKey: 'empty',
      assessmentName: 'Empty Assessment',
      slug: 'empty-assessment',
      category: 'other',
      locales: {
        defaultLocale: 'en-US',
        supportedLocales: [],
      },
      authoring: {},
      compatibility: {
        packageSemver: '0.0.1',
        contractVersion: '2',
      },
    },
    responseModels: {
      models: [],
    },
    questions: [],
    sections: [],
    dimensions: [],
  })

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path === 'metadata.locales.supportedLocales'))
  assert.ok(result.errors.some((issue) => issue.path === 'responseModels.models'))
  assert.ok(result.errors.some((issue) => issue.path === 'questions'))
  assert.ok(result.errors.some((issue) => issue.path === 'sections'))
  assert.ok(result.errors.some((issue) => issue.path === 'dimensions'))
})

test('Package Contract v2 accepts derived dimensions, integrity rules, and output predicates structurally', () => {
  const validation = validateSonartraAssessmentPackageV2(examplePackage)

  assert.equal(validation.ok, true)
  assert.equal(validation.normalizedPackage?.derivedDimensions[0]?.computation.method, 'formula')
  assert.equal(validation.normalizedPackage?.integrity.rules[0]?.kind, 'contradiction')
  assert.equal(validation.normalizedPackage?.outputs.rules[1]?.type, 'warning')

  const runtimePackage = compileAssessmentPackageV2(validation.normalizedPackage!)
  assert.equal(runtimePackage.ok, true)
  assert.equal(runtimePackage.executablePackage?.runtimeVersion, EXECUTABLE_ASSESSMENT_PACKAGE_V2_RUNTIME_VERSION)
})
