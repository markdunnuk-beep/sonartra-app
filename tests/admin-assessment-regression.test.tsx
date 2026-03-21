import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import type { AdminAssessmentVersionRecord } from '../lib/admin/domain/assessment-management'
import type { SonartraAssessmentPackageV1 } from '../lib/admin/domain/assessment-package'
import {
  compareAssessmentScenarioExecutions,
  executeAssessmentScenarioForVersion,
  selectAssessmentRegressionBaseline,
  summarizeAssessmentRegressionSuite,
  summarizeSavedAssessmentScenario,
  validateSavedAssessmentScenarioPayload,
  type AdminSavedAssessmentScenarioRecord,
} from '../lib/admin/domain/assessment-regression'

const pkgV1: SonartraAssessmentPackageV1 = {
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
      id: 'q1', promptKey: 'question.q1.prompt', dimensionId: 'drive', reverseScored: false, weight: 1,
      options: [
        { id: 'q1.low', labelKey: 'question.q1.low', value: 1, scoreMap: { drive: 1 } },
        { id: 'q1.high', labelKey: 'question.q1.high', value: 2, scoreMap: { drive: 4 } },
      ],
    },
    {
      id: 'q2', promptKey: 'question.q2.prompt', dimensionId: 'focus', reverseScored: false, weight: 1,
      options: [
        { id: 'q2.low', labelKey: 'question.q2.low', value: 1, scoreMap: { focus: 1 } },
        { id: 'q2.high', labelKey: 'question.q2.high', value: 2, scoreMap: { focus: 4 } },
      ],
    },
  ],
  scoring: { dimensionRules: [{ dimensionId: 'drive', aggregation: 'sum' }, { dimensionId: 'focus', aggregation: 'sum' }] },
  normalization: {
    scales: [{
      id: 'core-scale', dimensionIds: ['drive', 'focus'], range: { min: 0, max: 100 },
      bands: [
        { key: 'low', min: 0, max: 39, labelKey: 'band.low' },
        { key: 'mid', min: 40, max: 69, labelKey: 'band.mid' },
        { key: 'high', min: 70, max: 100, labelKey: 'band.high' },
      ],
    }],
  },
  outputs: { reportRules: [{ key: 'summary', labelKey: 'output.summary', dimensionIds: ['drive', 'focus'], normalizationScaleId: 'core-scale' }] },
  language: { locales: [{ locale: 'en', text: {
    'dimension.drive.label': 'Drive', 'dimension.focus.label': 'Focus', 'question.q1.prompt': 'Q1', 'question.q2.prompt': 'Q2',
    'question.q1.low': 'Low', 'question.q1.high': 'High', 'question.q2.low': 'Low', 'question.q2.high': 'High',
    'band.low': 'Low', 'band.mid': 'Mid', 'band.high': 'High', 'output.summary': 'Summary',
  } }] },
}

const pkgV2: SonartraAssessmentPackageV1 = {
  ...pkgV1,
  meta: { ...pkgV1.meta, versionLabel: '1.1.0' },
  questions: [
    {
      ...pkgV1.questions[0],
      options: [
        { id: 'q1.low', labelKey: 'question.q1.low', value: 1, scoreMap: { drive: 1 } },
        { id: 'q1.high', labelKey: 'question.q1.high', value: 2, scoreMap: { drive: 2 } },
      ],
    },
    pkgV1.questions[1],
  ],
  language: {
    locales: [{
      locale: 'en',
      text: {
        'dimension.drive.label': 'Drive', 'dimension.focus.label': 'Focus', 'question.q1.prompt': 'Q1', 'question.q2.prompt': 'Q2',
        'question.q1.low': 'Low', 'question.q1.high': 'High', 'question.q2.low': 'Low', 'question.q2.high': 'High',
        'band.low': 'Low', 'band.mid': 'Mid', 'band.high': 'High',
      },
    }],
  },
}

function makeVersion(id: string, versionLabel: string, lifecycleStatus: 'draft' | 'published' | 'archived', pkg: SonartraAssessmentPackageV1 | null, packageStatus: 'valid' | 'valid_with_warnings' | 'invalid' | 'missing' = 'valid'): AdminAssessmentVersionRecord {
  return {
    id,
    assessmentId: 'assessment-1',
    versionLabel,
    lifecycleStatus,
    sourceType: 'import',
    notes: null,
    hasDefinitionPayload: Boolean(pkg),
    validationStatus: packageStatus,
    packageInfo: {
      status: packageStatus,
      schemaVersion: pkg?.meta.schemaVersion ?? null,
      sourceType: 'manual_import',
      importedAt: '2026-03-21T00:00:00.000Z',
      importedByName: 'Rina Patel',
      sourceFilename: 'signals.json',
      summary: { dimensionsCount: 2, questionsCount: 2, optionsCount: 4, scoringRuleCount: 2, normalizationRuleCount: 1, outputRuleCount: 1, localeCount: 1 },
      errors: [],
      warnings: [],
    },
    normalizedPackage: pkg,
    createdAt: '2026-03-21T00:00:00.000Z',
    updatedAt: '2026-03-21T00:00:00.000Z',
    publishedAt: lifecycleStatus === 'published' ? '2026-03-21T00:00:00.000Z' : null,
    archivedAt: lifecycleStatus === 'archived' ? '2026-03-21T00:00:00.000Z' : null,
    createdByName: 'Rina Patel',
    updatedByName: 'Rina Patel',
    publishedByName: lifecycleStatus === 'published' ? 'Rina Patel' : null,
    latestSuiteSnapshot: null,
    savedScenarios: [],
  }
}

const baseScenario: AdminSavedAssessmentScenarioRecord = {
  id: 'scenario-1',
  assessmentDefinitionId: 'assessment-1',
  assessmentVersionId: 'version-draft',
  name: 'High benchmark',
  description: 'Primary publish benchmark.',
  scenarioType: 'baseline',
  status: 'active',
  locale: 'en',
  sampleResponsePayload: JSON.stringify({ answers: [{ questionId: 'q1', optionId: 'q1.high' }, { questionId: 'q2', optionId: 'q2.high' }], locale: 'en', source: 'manual_json' }),
  createdByIdentityId: 'admin-1',
  updatedByIdentityId: 'admin-1',
  createdAt: '2026-03-21T00:00:00.000Z',
  updatedAt: '2026-03-21T00:00:00.000Z',
}

test('saved scenario payload validation rejects malformed payloads cleanly', () => {
  const validation = validateSavedAssessmentScenarioPayload('{"answers":[{"questionId":"q1"}]}', makeVersion('version-draft', '1.1.0', 'draft', pkgV2))
  assert.equal(validation.ok, false)
  assert.match(validation.issues[0]?.message ?? '', /optionId is required/i)
})

test('baseline selection prefers published version before previous version and source version', () => {
  const current = makeVersion('version-draft', '1.1.0', 'draft', pkgV2)
  const published = makeVersion('version-published', '1.0.0', 'published', pkgV1)
  const baseline = selectAssessmentRegressionBaseline(current, [current, published], current.id)
  assert.equal(baseline.type, 'published')
  assert.equal(baseline.versionLabel, '1.0.0')
})

test('scenario comparison flags review-required regressions when scores shift against baseline', () => {
  const currentVersion = makeVersion('version-draft', '1.1.0', 'draft', pkgV2)
  const baselineVersion = makeVersion('version-published', '1.0.0', 'published', pkgV1)
  const scenario = summarizeSavedAssessmentScenario(baseScenario, currentVersion)
  const result = compareAssessmentScenarioExecutions(
    scenario,
    executeAssessmentScenarioForVersion(baseScenario, currentVersion),
    executeAssessmentScenarioForVersion(baseScenario, baselineVersion),
    selectAssessmentRegressionBaseline(currentVersion, [currentVersion, baselineVersion], currentVersion.id),
  )

  assert.equal(result.comparison.status, 'changed_review_required')
  assert.match(result.comparison.summary, /Warning count changed/i)
})

test('batch regression suite summarizes no-baseline and blocked states truthfully', () => {
  const currentVersion = makeVersion('version-draft', '1.1.0', 'draft', pkgV2)
  const blockedVersion = makeVersion('version-blocked', '0.9.0', 'draft', null, 'invalid')
  const scenario = summarizeSavedAssessmentScenario(baseScenario, currentVersion)
  const noBaselineSuite = summarizeAssessmentRegressionSuite([
    compareAssessmentScenarioExecutions(
      scenario,
      executeAssessmentScenarioForVersion(baseScenario, currentVersion),
      null,
      selectAssessmentRegressionBaseline(currentVersion, [currentVersion], currentVersion.id),
    ),
  ], selectAssessmentRegressionBaseline(currentVersion, [currentVersion], currentVersion.id))
  assert.equal(noBaselineSuite.results[0]?.comparison.status, 'changed_expected')

  const blockedSuite = summarizeAssessmentRegressionSuite([
    compareAssessmentScenarioExecutions(
      scenario,
      executeAssessmentScenarioForVersion(baseScenario, blockedVersion),
      null,
      { type: 'none', versionId: null, versionLabel: null, summary: 'No baseline' },
    ),
  ], { type: 'none', versionId: null, versionLabel: null, summary: 'No baseline' })
  assert.equal(blockedSuite.status, 'blocked')
})

test('scenario workspace component source includes scenario management and regression review sections', async () => {
  const source = await readFile(new URL('../components/admin/surfaces/AdminAssessmentScenarioLibraryWorkspace.tsx', import.meta.url), 'utf8')

  assert.match(source, /Create saved scenario/)
  assert.match(source, /Regression summary/)
  assert.match(source, /Per-scenario regression runs/)
  assert.match(source, /Load in simulate/)
})

test('scenario route and linked version surfaces expose scenario library workflow and saved scenario loading hooks', async () => {
  const routeSource = await readFile(new URL('../app/admin/assessments/[assessmentId]/versions/[versionNumber]/scenarios/page.tsx', import.meta.url), 'utf8')
  const simulationSource = await readFile(new URL('../app/admin/assessments/[assessmentId]/versions/[versionNumber]/simulate/page.tsx', import.meta.url), 'utf8')
  const reportPreviewSource = await readFile(new URL('../app/admin/assessments/[assessmentId]/versions/[versionNumber]/report-preview/page.tsx', import.meta.url), 'utf8')
  const detailSurface = await readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionDetailSurface.tsx', import.meta.url), 'utf8')

  assert.match(routeSource, /Assessment regression/)
  assert.match(routeSource, /AdminAssessmentScenarioLibraryWorkspace/)
  assert.match(simulationSource, /scenarioId/)
  assert.match(reportPreviewSource, /scenarioId/)
  assert.match(detailSurface, /Scenario library/)
})
