import assert from 'node:assert/strict'
import test from 'node:test'
import { validateSonartraAssessmentPackage } from '../lib/admin/domain/assessment-package'

const basePackage = {
  meta: {
    schemaVersion: 'sonartra-assessment-package/v1',
    assessmentKey: 'sonartra_signals',
    assessmentTitle: 'Sonartra Signals',
    versionLabel: '1.0.0',
    defaultLocale: 'en',
  },
  dimensions: [
    { id: 'drive', labelKey: 'dimension.drive.label' },
    { id: 'focus', labelKey: 'dimension.focus.label' },
  ],
  questions: [
    {
      id: 'q1',
      promptKey: 'question.q1.prompt',
      dimensionId: 'drive',
      reverseScored: false,
      weight: 1,
      options: [
        { id: 'q1.a', labelKey: 'question.q1.option.a', value: 1, scoreMap: { drive: 1 } },
        { id: 'q1.b', labelKey: 'question.q1.option.b', value: 2, scoreMap: { drive: 2, focus: 1 } },
      ],
    },
  ],
  scoring: {
    dimensionRules: [{ dimensionId: 'drive', aggregation: 'sum' }],
  },
  normalization: {
    scales: [
      {
        id: 'core-scale',
        dimensionIds: ['drive', 'focus'],
        range: { min: 0, max: 10 },
        bands: [
          { key: 'low', min: 0, max: 4, labelKey: 'band.low.label' },
          { key: 'high', min: 5, max: 10, labelKey: 'band.high.label' },
        ],
      },
    ],
  },
  outputs: {
    reportRules: [
      { key: 'core-summary', labelKey: 'output.core-summary.label', dimensionIds: ['drive'], normalizationScaleId: 'core-scale' },
    ],
  },
  language: {
    locales: [
      {
        locale: 'en',
        text: {
          'dimension.drive.label': 'Drive',
          'dimension.focus.label': 'Focus',
          'question.q1.prompt': 'Question',
          'question.q1.option.a': 'A',
          'question.q1.option.b': 'B',
          'band.low.label': 'Low',
          'band.high.label': 'High',
          'output.core-summary.label': 'Summary',
        },
      },
    ],
  },
}

test('validator accepts a practical v1 package and returns summary counts', () => {
  const result = validateSonartraAssessmentPackage(basePackage)

  assert.equal(result.ok, true)
  assert.equal(result.status, 'valid_with_warnings')
  assert.equal(result.summary.dimensionsCount, 2)
  assert.equal(result.summary.questionsCount, 1)
  assert.equal(result.summary.optionsCount, 2)
  assert.equal(result.summary.outputRuleCount, 1)
})

test('validator rejects duplicate ids and broken cross references', () => {
  const result = validateSonartraAssessmentPackage({
    ...basePackage,
    dimensions: [
      { id: 'drive', labelKey: 'dimension.drive.label' },
      { id: 'drive', labelKey: 'dimension.drive.duplicate' },
    ],
    questions: [
      {
        id: 'q1',
        promptKey: 'question.q1.prompt',
        dimensionId: 'missing',
        reverseScored: false,
        weight: 1,
        options: [
          { id: 'q1.a', labelKey: 'question.q1.option.a', value: 1, scoreMap: { missing: 1 } },
          { id: 'q1.a', labelKey: 'question.q1.option.b', value: 2, scoreMap: { drive: 2 } },
        ],
      },
    ],
  })

  assert.equal(result.ok, false)
  assert.equal(result.status, 'invalid')
  assert.ok(result.errors.some((issue) => /Duplicate dimension id/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /unknown dimension/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /Duplicate option id/i.test(issue.message)))
})

test('validator rejects missing required sections and empty question sets', () => {
  const result = validateSonartraAssessmentPackage({
    meta: basePackage.meta,
    dimensions: [],
    questions: [],
    scoring: {},
    normalization: {},
    language: { locales: [] },
  })

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path === 'dimensions'))
  assert.ok(result.errors.some((issue) => issue.path === 'questions'))
  assert.ok(result.errors.some((issue) => issue.path === 'scoring.dimensionRules'))
  assert.ok(result.errors.some((issue) => issue.path === 'normalization.scales'))
})
