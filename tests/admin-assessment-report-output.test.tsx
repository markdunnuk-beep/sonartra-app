import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminAssessmentVersionReportPreviewSurface } from '../components/admin/surfaces/AdminAssessmentVersionReportPreviewSurface'
import type { AdminAssessmentDetailData } from '../lib/admin/domain/assessment-management'
import type { SonartraAssessmentPackageV1 } from '../lib/admin/domain/assessment-package'
import { generateAdminAssessmentReportOutput, getAdminAssessmentReportPreviewWorkspaceStatus } from '../lib/admin/domain/assessment-report-output'
import { buildAdminAssessmentSimulationScenario, executeAdminAssessmentSimulation } from '../lib/admin/domain/assessment-simulation'

const basePackage: SonartraAssessmentPackageV1 = {
  meta: {
    schemaVersion: 'sonartra-assessment-package/v1',
    assessmentKey: 'sonartra_signals',
    assessmentTitle: 'Sonartra Signals',
    versionLabel: '2.1.0',
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

function createDetailData(pkg: SonartraAssessmentPackageV1 | null, status: 'valid' | 'valid_with_warnings' | 'invalid' | 'missing' = 'valid_with_warnings'): AdminAssessmentDetailData {
  return {
    assessment: {
      id: 'assessment-1',
      name: 'Sonartra Signals',
      key: 'sonartra_signals',
      slug: 'sonartra-signals',
      category: 'behavioural_intelligence',
      description: 'Core behavioural intelligence line.',
      lifecycleStatus: 'published',
      currentPublishedVersionId: 'version-1',
      currentPublishedVersionLabel: '2.1.0',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-21T00:00:00Z',
    },
    versions: [
      {
        id: 'version-1',
        assessmentId: 'assessment-1',
        versionLabel: '2.1.0',
        lifecycleStatus: 'published',
        sourceType: 'import',
        notes: 'Stable candidate',
        hasDefinitionPayload: true,
        validationStatus: status,
        packageInfo: {
          status,
          schemaVersion: pkg?.meta.schemaVersion ?? null,
          sourceType: status === 'missing' ? null : 'manual_import',
          importedAt: status === 'missing' ? null : '2026-03-21T00:00:00Z',
          importedByName: status === 'missing' ? null : 'Rina Patel',
          sourceFilename: status === 'missing' ? null : 'signals.json',
          summary: status === 'missing' ? null : {
            dimensionsCount: pkg?.dimensions.length ?? 0,
            questionsCount: pkg?.questions.length ?? 0,
            optionsCount: pkg?.questions.reduce((count, question) => count + question.options.length, 0) ?? 0,
            scoringRuleCount: pkg?.scoring.dimensionRules.length ?? 0,
            normalizationRuleCount: pkg?.normalization.scales.length ?? 0,
            outputRuleCount: pkg?.outputs?.reportRules.length ?? 0,
            localeCount: pkg?.language.locales.length ?? 0,
          },
          errors: status === 'invalid' ? [{ path: 'questions[0]', message: 'Broken question.' }] : [],
          warnings: status === 'valid_with_warnings' ? [{ path: 'outputs.reportRules[0]', message: 'Output copy is still thin.' }] : [],
        },
        normalizedPackage: status === 'invalid' || status === 'missing' ? null : pkg,
        createdAt: '2026-03-10T00:00:00Z',
        updatedAt: '2026-03-21T00:00:00Z',
        publishedAt: '2026-03-21T00:00:00Z',
        archivedAt: null,
        createdByName: 'Rina Patel',
        updatedByName: 'Rina Patel',
        publishedByName: 'Rina Patel',
      },
    ],
    activity: [],
    diagnostics: {
      versionCount: 1,
      draftCount: 0,
      archivedCount: 0,
      latestDraftVersionLabel: null,
      latestPublishedVersionLabel: '2.1.0',
      latestVersionUpdatedAt: '2026-03-21T00:00:00Z',
    },
  }
}

test('generated web summary output includes headline, dimension cards, and narrative sections for a representative package', () => {
  const simulation = executeAdminAssessmentSimulation(basePackage, buildAdminAssessmentSimulationScenario(basePackage, 'high'))
  assert.equal(simulation.ok, true)

  const output = generateAdminAssessmentReportOutput(basePackage, simulation.result!)

  assert.equal(output.webSummary.headline.text, 'Drive summary')
  assert.equal(output.webSummary.dimensionCards.length, 2)
  assert.ok(output.webSummary.sections.some((section) => section.kind === 'strengths'))
  assert.equal(output.quality.verdict, 'strong')
})

test('generated PDF-ready block structure is deterministic and ordered', () => {
  const simulation = executeAdminAssessmentSimulation(basePackage, buildAdminAssessmentSimulationScenario(basePackage, 'balanced'))
  const output = generateAdminAssessmentReportOutput(basePackage, simulation.result!)

  assert.equal(output.pdfBlocks[0]?.type, 'title')
  assert.equal(output.pdfBlocks[1]?.type, 'intro_summary')
  assert.ok(output.pdfBlocks.some((block) => block.type === 'dimension_profile'))
  assert.deepEqual(output.pdfBlocks.map((block) => block.order), output.pdfBlocks.map((_block, index) => index + 1))
})

test('missing language references are surfaced as warnings and quality gaps instead of silent invented copy', () => {
  const packageWithMissingOutputText: SonartraAssessmentPackageV1 = {
    ...basePackage,
    language: {
      locales: [{
        ...basePackage.language.locales[0],
        text: Object.fromEntries(Object.entries(basePackage.language.locales[0].text).filter(([key]) => key !== 'output.drive-summary.label')),
      }],
    },
  }

  const simulation = executeAdminAssessmentSimulation(packageWithMissingOutputText, buildAdminAssessmentSimulationScenario(packageWithMissingOutputText, 'high'))
  const output = generateAdminAssessmentReportOutput(packageWithMissingOutputText, simulation.result!)

  assert.match(output.webSummary.headline.text ?? '', /Missing language:/)
  assert.ok(output.warnings.some((warning) => /Missing language text for output label key/i.test(warning.message)))
  assert.equal(output.quality.verdict, 'usable_with_gaps')
})

test('output traceability maps sections back to rule, language, and score evidence', () => {
  const simulation = executeAdminAssessmentSimulation(basePackage, buildAdminAssessmentSimulationScenario(basePackage, 'high'))
  const output = generateAdminAssessmentReportOutput(basePackage, simulation.result!)
  const headlineTrace = output.traceability.find((trace) => trace.sectionId === 'headline')
  const dimensionTrace = output.traceability.find((trace) => trace.sectionId === 'dimension.drive')

  assert.deepEqual(headlineTrace?.ruleKeys, ['drive-summary'])
  assert.deepEqual(headlineTrace?.languageKeys, ['output.drive-summary.label'])
  assert.equal(headlineTrace?.scoreEvidence[0]?.dimensionId, 'drive')
  assert.ok(dimensionTrace?.references.some((reference) => reference.type === 'score'))
})

test('quality verdict falls to blocked when core content cannot be generated', () => {
  const packageWithoutNormalization: SonartraAssessmentPackageV1 = {
    ...basePackage,
    normalization: { scales: [] },
  }
  const simulation = executeAdminAssessmentSimulation(packageWithoutNormalization, buildAdminAssessmentSimulationScenario(packageWithoutNormalization, 'balanced'))
  const output = generateAdminAssessmentReportOutput(packageWithoutNormalization, simulation.result!)

  assert.equal(output.quality.verdict, 'blocked')
  assert.ok(output.quality.checks.some((check) => check.key === 'dimension_coverage' && check.status === 'fail'))
})

test('report preview workspace status and surface block invalid package states cleanly', () => {
  const blockedStatus = getAdminAssessmentReportPreviewWorkspaceStatus({
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

  assert.equal(blockedStatus.canGeneratePreview, false)
  assert.match(blockedStatus.summary, /preview is unavailable/i)

  const detailData = createDetailData(basePackage, 'invalid')
  const html = renderToStaticMarkup(<AdminAssessmentVersionReportPreviewSurface detailData={detailData} version={detailData.versions[0]!} />)
  assert.match(html, /Report-output preview is blocked/)
  assert.match(html, /Open package import/)
})

test('canonical report preview route uses version-level path and notFound handling', async () => {
  const source = await readFile(new URL('../app/admin/assessments/[assessmentId]/versions/[versionNumber]/report-preview/page.tsx', import.meta.url), 'utf8')

  assert.match(source, /AdminAssessmentVersionReportPreviewSurface/)
  assert.match(source, /getAdminAssessmentDetailData/)
  assert.match(source, /notFound\(\)/)
})

test('version detail and parent versions surfaces expose report-preview visibility', async () => {
  const detailSurface = await readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionDetailSurface.tsx', import.meta.url), 'utf8')
  const versionsManager = await readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionsManager.tsx', import.meta.url), 'utf8')

  assert.match(detailSurface, /Open report preview/)
  assert.match(detailSurface, /report-preview/)
  assert.match(versionsManager, /Report preview:/)
  assert.match(versionsManager, /Report preview/)
})
