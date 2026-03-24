import assert from 'node:assert/strict'
import test from 'node:test'

import type { SonartraAssessmentPackageV1 } from '../lib/admin/domain/assessment-package'
import {
  getAdminAssessmentPackagePreviewSummary,
  getAdminAssessmentVersionControlTowerSummary,
  getAdminAssessmentVersionDiff,
  getAdminAssessmentVersionReadiness,
} from '../lib/admin/domain/assessment-package-review'
import examplePackage from './fixtures/package-contract-v2-example.json'
import { importAssessmentPackagePayload } from '../lib/admin/server/assessment-package-import'

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
  latestSuiteSnapshot: {
    executedAt: '2026-03-20T01:00:00.000Z',
    executedBy: 'Rina Patel',
    baselineVersionId: null,
    baselineVersionLabel: null,
    totalScenarios: 2,
    passedCount: 2,
    warningCount: 0,
    failedCount: 0,
    overallStatus: 'pass' as const,
    summaryText: '2/2 passed.',
  },
  savedScenarios: [{
    id: 'scenario-1',
    versionId: 'version-1',
    versionLabel: '1.0.0',
    name: 'Baseline',
    description: null,
    status: 'active' as const,
    payload: '{}',
    sourceVersionId: null,
    sourceVersionLabel: null,
    sourceScenarioId: null,
    provenanceSummary: null,
    createdAt: '2026-03-20T00:00:00.000Z',
    updatedAt: '2026-03-20T00:00:00.000Z',
    archivedAt: null,
    createdByName: 'Rina Patel',
    updatedByName: 'Rina Patel',
  }],
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
  latestSuiteSnapshot: {
    executedAt: '2026-03-21T01:00:00.000Z',
    executedBy: 'Noah Chen',
    baselineVersionId: 'version-1',
    baselineVersionLabel: '1.0.0',
    totalScenarios: 1,
    passedCount: 0,
    warningCount: 1,
    failedCount: 0,
    overallStatus: 'warning' as const,
    summaryText: '0/1 passed · 1 warning(s).',
  },
  savedScenarios: [{
    id: 'scenario-2',
    versionId: 'version-2',
    versionLabel: '1.1.0',
    name: 'Warning case',
    description: null,
    status: 'active' as const,
    payload: '{}',
    sourceVersionId: null,
    sourceVersionLabel: null,
    sourceScenarioId: null,
    provenanceSummary: null,
    createdAt: '2026-03-21T00:00:00.000Z',
    updatedAt: '2026-03-21T00:00:00.000Z',
    archivedAt: null,
    createdByName: 'Noah Chen',
    updatedByName: 'Noah Chen',
  }],
}

test('package preview summarises normalized dimensions, questions, and coverage', () => {
  const preview = getAdminAssessmentPackagePreviewSummary(draftVersion)

  assert.equal(preview.state, 'ready')
  assert.match(preview.dimensionsSummary, /2 dimensions/)
  assert.match(preview.questionSummary, /2 questions/)
  assert.equal(preview.dimensions[0]?.id, 'drive')
  assert.equal(preview.questions[1]?.id, 'q2')
})

test('readiness checks explicitly include compile/execution and preview semantics for canonical v2', () => {
  const imported = importAssessmentPackagePayload(examplePackage)
  const readiness = getAdminAssessmentVersionReadiness({
    packageInfo: {
      status: imported.packageStatus,
      schemaVersion: imported.schemaVersion,
      sourceType: 'manual_import',
      importedAt: '2026-03-24T00:00:00.000Z',
      importedByName: 'A. Tester',
      sourceFilename: 'example-v2.json',
      summary: imported.summary,
      errors: imported.errors,
      warnings: imported.warnings,
    },
    normalizedPackage: imported.definitionPayload as never,
    storedDefinitionPayload: imported.definitionPayload as never,
    lifecycleStatus: 'draft',
    savedScenarios: [],
    latestSuiteSnapshot: null,
  })

  const compileCheck = readiness.checks.find((entry) => entry.key === 'admin_compilable_to_runtime')
  const execCheck = readiness.checks.find((entry) => entry.key === 'admin_execution_ready')
  const previewCheck = readiness.checks.find((entry) => entry.key === 'preview_simulation_ready')
  const classifierCheck = readiness.checks.find((entry) => entry.key === 'contract_payload_classification')

  assert.equal(classifierCheck?.status, 'pass')
  assert.equal(compileCheck?.status, 'pass')
  assert.equal(execCheck?.status, 'pass')
  assert.equal(previewCheck?.status, 'pass')
})


test('structured diff unavailable copy uses workflow history wording when baseline lacks normalized evidence', () => {
  const legacyVersion = {
    ...publishedVersion,
    id: 'version-legacy',
    versionLabel: '0.9.0',
    updatedAt: '2026-03-19T00:00:00.000Z',
    normalizedPackage: null,
  }

  const diff = getAdminAssessmentVersionDiff(draftVersion, [legacyVersion, draftVersion])
  const controlTower = getAdminAssessmentVersionControlTowerSummary(draftVersion, [legacyVersion, draftVersion])

  assert.equal(diff.hasBaseline, true)
  assert.match(diff.summary, /stored without normalized package evidence/i)
  assert.match(diff.summaryLines[0] ?? '', /earlier version was imported before normalized package evidence was stored/i)
  assert.match(diff.summaryLines[1] ?? '', /both compared versions include normalized package evidence/i)
  assert.doesNotMatch(controlTower.snippet, /blocked|failed/i)
})

test('readiness returns ready_with_warnings and blocked states truthfully', () => {
  const withWarnings = getAdminAssessmentVersionReadiness(draftVersion)
  const blocked = getAdminAssessmentVersionReadiness({
    lifecycleStatus: 'draft',
    packageInfo: {
      ...draftVersion.packageInfo,
      status: 'invalid',
      errors: [{ path: 'questions[0].dimensionId', message: 'Unknown dimension.' }],
      warnings: [],
      summary: null,
    },
    normalizedPackage: null,
  })

  assert.equal(withWarnings.status, 'ready_with_warnings')
  assert.equal(withWarnings.verdict, 'ready_with_warnings')
  assert.ok(withWarnings.warnings.length >= 1)
  assert.equal(blocked.status, 'not_ready')
  assert.equal(blocked.verdict, 'blocked')
  assert.ok(blocked.blockingIssues.some((issue) => /unknown dimension|missing|invalid/i.test(issue)))
})


test('readiness returns ready when package, scenarios, and suite snapshot are all clean', () => {
  const cleanPackage: SonartraAssessmentPackageV1 = {
    ...draftPackage,
    scoring: {
      dimensionRules: [
        { dimensionId: 'drive', aggregation: 'sum' as const },
        { dimensionId: 'focus', aggregation: 'sum' as const },
      ],
    },
    outputs: {
      reportRules: [{ key: 'summary', labelKey: 'output.summary.label', dimensionIds: ['drive', 'focus'], normalizationScaleId: 'scale-1' }],
    },
  }

  const ready = getAdminAssessmentVersionReadiness({
    ...draftVersion,
    packageInfo: { ...draftVersion.packageInfo, status: 'valid', warnings: [] },
    normalizedPackage: cleanPackage,
    latestSuiteSnapshot: {
      ...draftVersion.latestSuiteSnapshot,
      overallStatus: 'pass' as const,
      warningCount: 0,
      summaryText: '1/1 passed.',
    },
  })

  assert.equal(ready.status, 'ready')
  assert.equal(ready.blockingIssues.length, 0)
  assert.equal(ready.warnings.length, 0)
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
  assert.match(diff.summary, /first imported version|no comparison baseline yet/i)
})

test('control-tower summary combines readiness and diff evidence into one snippet', () => {
  const summary = getAdminAssessmentVersionControlTowerSummary(draftVersion, [publishedVersion, draftVersion], publishedVersion.id)

  assert.equal(summary.readiness.verdict, 'ready_with_warnings')
  assert.match(summary.snippet, /ready with warnings/i)
  assert.match(summary.snippet, /question/i)
})
