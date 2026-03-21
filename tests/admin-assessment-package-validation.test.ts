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
      {
        key: 'core-summary',
        labelKey: 'output.core-summary.label',
        dimensionIds: ['drive'],
        normalizationScaleId: 'core-scale',
        narrative: {
          summaryHeadline: { key: 'output.core-summary.headline' },
          summaryBody: { key: 'output.core-summary.body' },
          strengths: { body: { key: 'output.core-summary.strengths.body' } },
          recommendations: { body: { inline: { default: 'Keep reinforcing drive with deliberate pacing.' } } },
          dimensionNarratives: [
            {
              dimensionId: 'drive',
              body: { key: 'output.core-summary.dimension.drive.body' },
              bandNarratives: [
                { bandKey: 'high', body: { inline: { default: 'Drive is surfacing strongly in this sample profile.' } } },
              ],
            },
          ],
          variants: [
            { bandKey: 'high', summaryBody: { key: 'output.core-summary.body.high' } },
          ],
        },
      },
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
          'output.core-summary.headline': 'Ready to move',
          'output.core-summary.body': 'This profile trends toward decisive forward motion.',
          'output.core-summary.body.high': 'This profile shows especially strong forward momentum.',
          'output.core-summary.strengths.body': 'Drive is a clear authored strength in this package.',
          'output.core-summary.dimension.drive.body': 'Drive narrative from the package.',
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


test('validator accepts authored narrative structures without breaking v1 compatibility', () => {
  const result = validateSonartraAssessmentPackage(basePackage)

  assert.equal(result.ok, true)
  assert.ok(result.normalizedPackage?.outputs?.reportRules[0]?.narrative)
  assert.equal(result.normalizedPackage?.outputs?.reportRules[0]?.narrative?.summaryHeadline?.key, 'output.core-summary.headline')
})

test('validator rejects malformed authored narrative references cleanly', () => {
  const result = validateSonartraAssessmentPackage({
    ...basePackage,
    outputs: {
      reportRules: [{
        ...basePackage.outputs.reportRules[0],
        narrative: {
          summaryHeadline: { key: 'missing.language.key' },
          dimensionNarratives: [
            { dimensionId: 'missing-dimension', body: { inline: { default: 'Broken dimension ref' } } },
          ],
          variants: [
            { bandKey: 'missing-band', summaryBody: { inline: { default: 'Broken band ref' } } },
          ],
        },
      }],
    },
  })

  assert.equal(result.ok, false)
  assert.ok(result.errors.some((issue) => issue.path.includes('missing.language.key')))
  assert.ok(result.errors.some((issue) => /unknown dimension/i.test(issue.message)))
  assert.ok(result.errors.some((issue) => /unknown band/i.test(issue.message)))
})
