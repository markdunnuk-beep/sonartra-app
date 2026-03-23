import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

import type { SonartraAssessmentPackageV1 } from '../lib/admin/domain/assessment-package'
import {
  buildAdminAssessmentSimulationScenario,
  executeAdminAssessmentSimulation,
  getAdminAssessmentSimulationWorkspaceStatus,
  parseAdminAssessmentSimulationPayload,
} from '../lib/admin/domain/assessment-simulation-server'

const basePackage: SonartraAssessmentPackageV1 = {
  meta: {
    schemaVersion: 'sonartra-assessment-package/v1',
    assessmentKey: 'sonartra_signals',
    assessmentTitle: 'Sonartra Signals',
    versionLabel: '2.0.0',
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
      weight: 2,
      options: [
        { id: 'q1.low', labelKey: 'question.q1.option.low', value: 1, scoreMap: { drive: 1 } },
        { id: 'q1.high', labelKey: 'question.q1.option.high', value: 2, scoreMap: { drive: 3 } },
      ],
    },
    {
      id: 'q2',
      promptKey: 'question.q2.prompt',
      dimensionId: 'focus',
      reverseScored: true,
      weight: 1,
      options: [
        { id: 'q2.low', labelKey: 'question.q2.option.low', value: 1, scoreMap: { focus: 1 } },
        { id: 'q2.mid', labelKey: 'question.q2.option.mid', value: 2, scoreMap: { focus: 2 } },
        { id: 'q2.high', labelKey: 'question.q2.option.high', value: 3, scoreMap: { focus: 3 } },
      ],
    },
  ],
  scoring: {
    dimensionRules: [
      { dimensionId: 'drive', aggregation: 'sum' },
      { dimensionId: 'focus', aggregation: 'sum' },
    ],
  },
  normalization: {
    scales: [
      {
        id: 'core-scale',
        dimensionIds: ['drive', 'focus'],
        range: { min: 0, max: 100 },
        bands: [
          { key: 'low', min: 0, max: 39, labelKey: 'band.low.label' },
          { key: 'mid', min: 40, max: 69, labelKey: 'band.mid.label' },
          { key: 'high', min: 70, max: 100, labelKey: 'band.high.label' },
        ],
      },
    ],
  },
  outputs: {
    reportRules: [
      { key: 'drive-summary', labelKey: 'output.drive-summary.label', dimensionIds: ['drive'], normalizationScaleId: 'core-scale' },
      { key: 'combined-summary', labelKey: 'output.combined-summary.label', dimensionIds: ['drive', 'focus'], normalizationScaleId: 'core-scale' },
    ],
  },
  language: {
    locales: [
      {
        locale: 'en',
        text: {
          'dimension.drive.label': 'Drive',
          'dimension.focus.label': 'Focus',
          'question.q1.prompt': 'I set the pace for delivery.',
          'question.q1.option.low': 'Not often',
          'question.q1.option.high': 'Very often',
          'question.q2.prompt': 'I keep focus under pressure.',
          'question.q2.option.low': 'Low',
          'question.q2.option.mid': 'Medium',
          'question.q2.option.high': 'High',
          'band.low.label': 'Low',
          'band.mid.label': 'Mid',
          'band.high.label': 'High',
          'output.drive-summary.label': 'Drive summary',
          'output.combined-summary.label': 'Combined summary',
        },
      },
    ],
  },
}

test('simulation engine executes scoring, reverse scoring, normalization, and outputs deterministically', () => {
  const request = {
    answers: [
      { questionId: 'q1', optionId: 'q1.high' },
      { questionId: 'q2', optionId: 'q2.low' },
    ],
    locale: 'en',
    source: 'manual_json' as const,
    scenarioKey: null,
  }

  const result = executeAdminAssessmentSimulation(basePackage, request)

  assert.equal(result.ok, true)
  assert.equal(result.result?.rawScores.find((entry) => entry.dimensionId === 'drive')?.rawScore, 6)
  assert.equal(result.result?.rawScores.find((entry) => entry.dimensionId === 'focus')?.rawScore, 3)
  assert.equal(result.result?.normalizedScores.find((entry) => entry.dimensionId === 'drive')?.normalizedScore, 100)
  assert.equal(result.result?.normalizedScores.find((entry) => entry.dimensionId === 'focus')?.band?.key, 'high')
  assert.equal(result.result?.outputs.every((entry) => entry.triggered), true)
  assert.match(result.result?.trace.questions[1]?.effectiveOptionId ?? '', /q2.high/)
})

test('simulation engine rejects malformed or incomplete sample responses cleanly', () => {
  const payload = parseAdminAssessmentSimulationPayload('{"answers":[{"questionId":"q1"}]}')
  assert.equal(payload.ok, false)
  assert.match(payload.errors[0]?.message ?? '', /optionId is required/i)

  const execution = executeAdminAssessmentSimulation(basePackage, {
    answers: [{ questionId: 'q1', optionId: 'q1.high' }],
    locale: 'en',
    source: 'manual_json',
    scenarioKey: null,
  })

  assert.equal(execution.ok, false)
  assert.ok(execution.errors.some((issue) => /requires a selected option/i.test(issue.message)))
})

test('simulation engine surfaces unresolved output language references as warnings', () => {
  const packageWithMissingOutputText: SonartraAssessmentPackageV1 = {
    ...basePackage,
    language: {
      locales: [{
        ...basePackage.language.locales[0],
        text: Object.fromEntries(Object.entries(basePackage.language.locales[0].text).filter(([key]) => key !== 'output.combined-summary.label')),
      }],
    },
  }

  const result = executeAdminAssessmentSimulation(packageWithMissingOutputText, buildAdminAssessmentSimulationScenario(basePackage, 'balanced'))

  assert.equal(result.ok, true)
  assert.ok(result.warnings.some((issue) => /Missing language text for output label key/i.test(issue.message)))
  assert.equal(result.result?.outputs.find((entry) => entry.key === 'combined-summary')?.label, 'output.combined-summary.label')
})

test('simulation workspace status blocks versions without a valid normalized package', () => {
  const blocked = getAdminAssessmentSimulationWorkspaceStatus({
    packageInfo: {
      status: 'invalid',
      schemaVersion: 'sonartra-assessment-package/v1',
      sourceType: 'manual_import',
      importedAt: null,
      importedByName: null,
      sourceFilename: null,
      summary: null,
      errors: [{ path: 'questions[0]', message: 'Broken question.' }],
      warnings: [],
    },
    normalizedPackage: null,
  })

  assert.equal(blocked.canRunSimulation, false)
  assert.match(blocked.blockingReason ?? '', /valid package is attached/i)
})

test('simulation route uses the canonical version-level path and notFound handling', async () => {
  const source = await readFile(new URL('../app/admin/assessments/[assessmentId]/versions/[versionNumber]/simulate/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /AdminAssessmentVersionSimulationSurface/)
  assert.match(source, /getAdminAssessmentDetailData/)
  assert.match(source, /notFound\(\)/)
})

test('admin version surfaces expose simulation entry points in detail and parent workspaces', async () => {
  const detailSurface = await readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionDetailSurface.tsx', import.meta.url), 'utf8')
  const versionsManager = await readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionsManager.tsx', import.meta.url), 'utf8')

  assert.match(detailSurface, /Open simulation workspace/)
  assert.match(detailSurface, /\/simulate/)
  assert.match(versionsManager, /Simulation:/)
  assert.match(versionsManager, /Simulate/)
})
