import assert from 'node:assert/strict'
import test from 'node:test'

import type { SonartraAssessmentPackageV1 } from '../lib/admin/domain/assessment-package'
import {
  getAdminAssessmentPackagePreviewSummary,
  getAdminAssessmentVersionControlTowerSummary,
  getAdminAssessmentVersionDiff,
  getAdminAssessmentVersionReadiness,
} from '../lib/admin/domain/assessment-package-review'

const baselinePackage: SonartraAssessmentPackageV1 = {
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
        { id: 'q1.b', labelKey: 'question.q1.option.b', value: 2, scoreMap: { drive: 2 } },
      ],
    },
  ],
  scoring: { dimensionRules: [{ dimensionId: 'drive', aggregation: 'sum' as const }] },
  normalization: {
    scales: [
      {
        id: 'scale-1',
        dimensionIds: ['drive'],
        range: { min: 0, max: 10 },
        bands: [
          { key: 'low', min: 0, max: 4, labelKey: 'band.low.label' },
          { key: 'high', min: 5, max: 10, labelKey: 'band.high.label' },
        ],
      },
    ],
  },
  outputs: {
    reportRules: [{ key: 'summary', labelKey: 'output.summary.label', dimensionIds: ['drive'], normalizationScaleId: 'scale-1' }],
  },
  language: {
    locales: [
      {
        locale: 'en',
        text: {
          'dimension.drive.label': 'Drive',
          'dimension.focus.label': 'Focus',
          'question.q1.prompt': 'Prompt',
          'question.q1.option.a': 'A',
          'question.q1.option.b': 'B',
          'band.low.label': 'Low',
          'band.high.label': 'High',
          'output.summary.label': 'Summary',
        },
      },
    ],
  },
}

const draftPackage: SonartraAssessmentPackageV1 = {
  ...baselinePackage,
  meta: { ...baselinePackage.meta, versionLabel: '1.1.0' },
  questions: [
    ...baselinePackage.questions,
    {
      id: 'q2',
      promptKey: 'question.q2.prompt',
      dimensionId: 'focus',
      reverseScored: false,
      weight: 1,
      options: [
        { id: 'q2.a', labelKey: 'question.q2.option.a', value: 1, scoreMap: { focus: 1 } },
        { id: 'q2.b', labelKey: 'question.q2.option.b', value: 2, scoreMap: { focus: 2 } },
      ],
    },
  ],
  normalization: {
    scales: [
      {
        id: 'scale-1',
        dimensionIds: ['drive', 'focus'],
        range: { min: 0, max: 10 },
        bands: [
          { key: 'low', min: 0, max: 4, labelKey: 'band.low.label' },
          { key: 'high', min: 5, max: 10, labelKey: 'band.high.label' },
        ],
      },
    ],
  },
  language: {
    locales: [
      {
        locale: 'en',
        text: {
          ...baselinePackage.language.locales[0].text,
          'question.q2.prompt': 'Prompt 2',
          'question.q2.option.a': 'A2',
          'question.q2.option.b': 'B2',
        },
      },
    ],
  },
}

const publishedVersion = {
  id: 'version-1',
  versionLabel: '1.0.0',
  lifecycleStatus: 'published' as const,
  updatedAt: '2026-03-20T00:00:00.000Z',
  packageInfo: {
    status: 'valid' as const,
    schemaVersion: 'sonartra-assessment-package/v1',
    sourceType: 'manual_import' as const,
    importedAt: '2026-03-20T00:00:00.000Z',
    importedByName: 'Rina Patel',
    sourceFilename: 'signals-v1.json',
    summary: {
      dimensionsCount: 2,
      questionsCount: 1,
      optionsCount: 2,
      scoringRuleCount: 1,
      normalizationRuleCount: 1,
      outputRuleCount: 1,
      localeCount: 1,
    },
    errors: [],
    warnings: [],
  },
  normalizedPackage: baselinePackage,
}

const draftVersion = {
  id: 'version-2',
  versionLabel: '1.1.0',
  lifecycleStatus: 'draft' as const,
  updatedAt: '2026-03-21T00:00:00.000Z',
  packageInfo: {
    status: 'valid_with_warnings' as const,
    schemaVersion: 'sonartra-assessment-package/v1',
    sourceType: 'manual_import' as const,
    importedAt: '2026-03-21T00:00:00.000Z',
    importedByName: 'Noah Chen',
    sourceFilename: 'signals-v1.1.json',
    summary: {
      dimensionsCount: 2,
      questionsCount: 2,
      optionsCount: 4,
      scoringRuleCount: 1,
      normalizationRuleCount: 1,
      outputRuleCount: 1,
      localeCount: 1,
    },
    errors: [],
    warnings: [{ path: 'scoring.dimensionRules', message: 'Not every dimension has an explicit scoring rule.' }],
  },
  normalizedPackage: draftPackage,
}

test('package preview summarises normalized dimensions, questions, and coverage', () => {
  const preview = getAdminAssessmentPackagePreviewSummary(draftVersion)

  assert.equal(preview.state, 'ready')
  assert.match(preview.dimensionsSummary, /2 dimensions/)
  assert.match(preview.questionSummary, /2 questions/)
  assert.equal(preview.dimensions[0]?.id, 'drive')
  assert.equal(preview.questions[1]?.id, 'q2')
})

test('readiness returns ready_with_warnings and blocked states truthfully', () => {
  const withWarnings = getAdminAssessmentVersionReadiness(draftVersion)
  const blocked = getAdminAssessmentVersionReadiness({
    packageInfo: {
      ...draftVersion.packageInfo,
      status: 'invalid',
      errors: [{ path: 'questions[0].dimensionId', message: 'Unknown dimension.' }],
      warnings: [],
      summary: null,
    },
    normalizedPackage: null,
  })

  assert.equal(withWarnings.verdict, 'ready_with_warnings')
  assert.ok(withWarnings.warnings.length >= 1)
  assert.equal(blocked.verdict, 'blocked')
  assert.ok(blocked.blockingIssues.some((issue) => /unknown dimension|missing|invalid/i.test(issue)))
})

test('diff compares draft against the published baseline and reports material changes', () => {
  const diff = getAdminAssessmentVersionDiff(draftVersion, [publishedVersion, draftVersion], publishedVersion.id)

  assert.equal(diff.hasBaseline, true)
  assert.equal(diff.baseline?.reason, 'published_baseline')
  assert.equal(diff.materiallyDifferent, true)
  assert.ok(diff.summaryLines.some((line) => /question\(s\) added/i.test(line)))
  assert.ok(diff.coverageChanges.some((line) => /Normalization coverage changed/i.test(line)))
})

test('diff reports a clean first-version state when no baseline exists', () => {
  const diff = getAdminAssessmentVersionDiff(draftVersion, [draftVersion], null)

  assert.equal(diff.hasBaseline, false)
  assert.match(diff.summary, /first-version package/i)
})

test('control-tower summary combines readiness and diff evidence into one snippet', () => {
  const summary = getAdminAssessmentVersionControlTowerSummary(draftVersion, [publishedVersion, draftVersion], publishedVersion.id)

  assert.equal(summary.readiness.verdict, 'ready_with_warnings')
  assert.match(summary.snippet, /ready with warnings/i)
  assert.match(summary.snippet, /question/i)
})
