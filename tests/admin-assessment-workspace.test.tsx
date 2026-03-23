import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminAssessmentsRegistrySurface } from '../components/admin/surfaces/AdminAssessmentsRegistrySurface'
import { AdminAssessmentDetailSurface } from '../components/admin/surfaces/AdminAssessmentDetailSurface'
import { AdminAssessmentVersionDetailSurface } from '../components/admin/surfaces/AdminAssessmentVersionDetailSurface'
import {
  getAdminAssessmentDetailTab,
  getAdminAssessmentRegistryFilters,
} from '../lib/admin/domain/assessment-management'
import type { SonartraAssessmentPackageV1 } from '../lib/admin/domain/assessment-package'
import { mapAssessmentVersionRows } from '../lib/admin/server/assessment-management'

const normalizedPackage: SonartraAssessmentPackageV1 = {
  meta: {
    schemaVersion: 'sonartra-assessment-package/v1',
    assessmentKey: 'sonartra_signals',
    assessmentTitle: 'Sonartra Signals',
    versionLabel: '1.2.0',
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
    {
      id: 'q2',
      promptKey: 'question.q2.prompt',
      dimensionId: 'focus',
      reverseScored: false,
      weight: 1,
      options: [
        { id: 'q2.a', labelKey: 'question.q2.option.a', value: 1, scoreMap: { focus: 1 } },
        { id: 'q2.b', labelKey: 'question.q2.option.b', value: 2, scoreMap: { focus: 2, drive: 1 } },
      ],
    },
  ],
  scoring: {
    dimensionRules: [
      { dimensionId: 'drive', aggregation: 'sum' as const },
    ],
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
          'question.q1.prompt': 'I naturally set the pace for the team.',
          'question.q1.option.a': 'Rarely',
          'question.q1.option.b': 'Often',
          'question.q2.prompt': 'I maintain focus in ambiguity.',
          'question.q2.option.a': 'Sometimes',
          'question.q2.option.b': 'Consistently',
          'band.low.label': 'Low',
          'band.high.label': 'High',
          'output.core-summary.label': 'Core summary',
        },
      },
    ],
  },
}

const priorNormalizedPackage: SonartraAssessmentPackageV1 = {
  ...normalizedPackage,
  meta: { ...normalizedPackage.meta, versionLabel: '1.1.0' },
  questions: [normalizedPackage.questions[0]],
  normalization: {
    scales: [
      {
        id: 'core-scale',
        dimensionIds: ['drive'],
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
          'dimension.drive.label': 'Drive',
          'question.q1.prompt': 'I naturally set the pace for the team.',
          'question.q1.option.a': 'Rarely',
          'question.q1.option.b': 'Often',
          'band.low.label': 'Low',
          'band.high.label': 'High',
          'output.core-summary.label': 'Core summary',
        },
      },
    ],
  },
}

const registryData = {
  filters: {
    query: '',
    lifecycle: 'all' as const,
    category: 'all' as const,
    sort: 'updated_desc' as const,
    page: 1,
    pageSize: 20,
  },
  entries: [
    {
      id: 'assessment-1',
      name: 'Sonartra Signals',
      key: 'sonartra_signals',
      slug: 'sonartra-signals',
      category: 'behavioural_intelligence',
      lifecycleStatus: 'published' as const,
      currentPublishedVersionLabel: '1.2.0',
      versionCount: 3,
      updatedAt: '2026-03-21T09:00:00Z',
      createdAt: '2026-03-01T09:00:00Z',
      description: 'Core behavioural intelligence line.',
    },
  ],
  summary: {
    publishedCount: 1,
    draftCount: 0,
    archivedCount: 0,
  },
  pagination: {
    page: 1,
    pageSize: 20,
    totalCount: 1,
    totalPages: 1,
    hasPreviousPage: false,
    hasNextPage: false,
    windowStart: 1,
    windowEnd: 1,
  },
}

const packageInfo = {
  status: 'valid_with_warnings' as const,
  schemaVersion: 'sonartra-assessment-package/v1',
  sourceType: 'manual_import' as const,
  importedAt: '2026-03-21T08:00:00Z',
  importedByName: 'Rina Patel',
  sourceFilename: 'signals-v1.json',
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
}

const detailData = {
  assessment: {
    id: 'assessment-1',
    name: 'Sonartra Signals',
    key: 'sonartra_signals',
    slug: 'sonartra-signals',
    category: 'behavioural_intelligence',
    description: 'Core behavioural intelligence line.',
    lifecycleStatus: 'published' as const,
    currentPublishedVersionId: 'version-2',
    currentPublishedVersionLabel: '1.2.0',
    createdAt: '2026-03-01T09:00:00Z',
    updatedAt: '2026-03-21T09:00:00Z',
  },
  versions: [
    {
      id: 'version-2',
      assessmentId: 'assessment-1',
      versionLabel: '1.2.0',
      lifecycleStatus: 'published' as const,
      sourceType: 'import' as const,
      notes: 'Current stable release',
      hasDefinitionPayload: true,
      validationStatus: 'valid_with_warnings',
      packageInfo,
      normalizedPackage,
      createdAt: '2026-03-10T09:00:00Z',
      updatedAt: '2026-03-21T09:00:00Z',
      publishedAt: '2026-03-21T09:00:00Z',
      archivedAt: null,
      createdByName: 'Noah Chen',
      updatedByName: 'Noah Chen',
      publishedByName: 'Rina Patel',
      latestSuiteSnapshot: {
        executedAt: '2026-03-21T09:15:00Z',
        executedBy: 'Rina Patel',
        baselineVersionId: 'version-1',
        baselineVersionLabel: '1.1.0',
        totalScenarios: 2,
        passedCount: 1,
        warningCount: 1,
        failedCount: 0,
        overallStatus: 'warning' as const,
        summaryText: '1/2 passed · 1 warning(s).',
      },
      savedScenarios: [
        {
          id: 'scenario-1',
          versionId: 'version-2',
          versionLabel: '1.2.0',
          name: 'Leadership baseline',
          description: 'Published release baseline.',
          status: 'active' as const,
          payload: JSON.stringify({ answers: [{ questionId: 'q1', optionId: 'q1.b' }], locale: 'en', source: 'manual_json', scenarioKey: null }),
          sourceVersionId: null,
          sourceVersionLabel: null,
          sourceScenarioId: null,
          provenanceSummary: 'Local to this version',
          createdAt: '2026-03-20T09:00:00Z',
          updatedAt: '2026-03-21T09:00:00Z',
          archivedAt: null,
          createdByName: 'Rina Patel',
          updatedByName: 'Rina Patel',
        },
      ],
    },
    {
      id: 'version-3',
      assessmentId: 'assessment-1',
      versionLabel: '1.3.0',
      lifecycleStatus: 'draft' as const,
      sourceType: 'import' as const,
      notes: 'Next draft candidate',
      hasDefinitionPayload: true,
      validationStatus: 'valid_with_warnings',
      packageInfo: {
        ...packageInfo,
        importedAt: '2026-03-22T09:00:00Z',
        importedByName: 'Noah Chen',
        sourceFilename: 'signals-v1.3.json',
      },
      normalizedPackage,
      createdAt: '2026-03-22T09:00:00Z',
      updatedAt: '2026-03-22T09:00:00Z',
      publishedAt: null,
      archivedAt: null,
      createdByName: 'Noah Chen',
      updatedByName: 'Noah Chen',
      publishedByName: null,
      latestSuiteSnapshot: {
        executedAt: '2026-03-22T10:30:00Z',
        executedBy: 'Noah Chen',
        baselineVersionId: 'version-2',
        baselineVersionLabel: '1.2.0',
        totalScenarios: 2,
        passedCount: 1,
        warningCount: 1,
        failedCount: 0,
        overallStatus: 'warning' as const,
        summaryText: '1/2 passed · 1 warning(s).',
      },
      savedScenarios: [
        {
          id: 'scenario-draft',
          versionId: 'version-3',
          versionLabel: '1.3.0',
          name: 'Draft regression',
          description: 'Draft carry-forward scenario.',
          status: 'active' as const,
          payload: JSON.stringify({ answers: [{ questionId: 'q1', optionId: 'q1.b' }, { questionId: 'q2', optionId: 'q2.b' }], locale: 'en', source: 'manual_json', scenarioKey: null }),
          sourceVersionId: 'version-2',
          sourceVersionLabel: '1.2.0',
          sourceScenarioId: 'scenario-1',
          provenanceSummary: 'Copied from v1.2.0 · source scenario scenario-1.',
          createdAt: '2026-03-22T09:10:00Z',
          updatedAt: '2026-03-22T10:30:00Z',
          archivedAt: null,
          createdByName: 'Noah Chen',
          updatedByName: 'Noah Chen',
        },
      ],
    },
    {
      id: 'version-1',
      assessmentId: 'assessment-1',
      versionLabel: '1.1.0',
      lifecycleStatus: 'archived' as const,
      sourceType: 'import' as const,
      notes: 'Prior baseline',
      hasDefinitionPayload: true,
      validationStatus: 'valid',
      packageInfo: {
        status: 'valid' as const,
        schemaVersion: 'sonartra-assessment-package/v1',
        sourceType: 'manual_import' as const,
        importedAt: '2026-03-15T08:00:00Z',
        importedByName: 'Rina Patel',
        sourceFilename: 'signals-v1.1.json',
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
      normalizedPackage: priorNormalizedPackage,
      createdAt: '2026-03-15T09:00:00Z',
      updatedAt: '2026-03-15T09:00:00Z',
      publishedAt: null,
      archivedAt: '2026-03-21T09:00:00Z',
      createdByName: 'Rina Patel',
      updatedByName: 'Rina Patel',
      publishedByName: null,
      latestSuiteSnapshot: null,
      savedScenarios: [
        {
          id: 'scenario-legacy',
          versionId: 'version-1',
          versionLabel: '1.1.0',
          name: 'Legacy baseline',
          description: 'Prior release suite scenario.',
          status: 'active' as const,
          payload: JSON.stringify({ answers: [{ questionId: 'q1', optionId: 'q1.a' }], locale: 'en', source: 'manual_json', scenarioKey: null }),
          sourceVersionId: null,
          sourceVersionLabel: null,
          sourceScenarioId: null,
          provenanceSummary: 'Original saved scenario',
          createdAt: '2026-03-15T09:00:00Z',
          updatedAt: '2026-03-15T09:00:00Z',
          archivedAt: null,
          createdByName: 'Rina Patel',
          updatedByName: 'Rina Patel',
        },
      ],
    },
  ],
  activity: [
    {
      id: 'audit-1',
      eventType: 'assessment_created',
      summary: 'Assessment record Sonartra Signals created in draft state.',
      actorId: 'admin-1',
      actorName: 'Rina Patel',
      happenedAt: '2026-03-01T09:00:00Z',
      source: 'audit' as const,
      entityType: 'assessment' as const,
      entityId: 'assessment-1',
      entityName: 'Sonartra Signals',
      entitySecondary: '1.2.0',
    },
    {
      id: 'audit-2',
      eventType: 'assessment_package_imported',
      summary: 'Assessment package imported for Sonartra Signals v1.2.0 · 2 questions · 2 dimensions · 1 warning(s).',
      actorId: 'admin-1',
      actorName: 'Rina Patel',
      happenedAt: '2026-03-21T08:00:00Z',
      source: 'audit' as const,
      entityType: 'assessment_version' as const,
      entityId: 'version-2',
      entityName: 'Sonartra Signals v1.2.0',
      entitySecondary: 'assessment-1',
    },
    {
      id: 'audit-3',
      eventType: 'assessment_publish_blocked_invalid_package',
      summary: 'Publish blocked for Sonartra Signals v1.3.0: Attach a package before publish.',
      actorId: 'admin-1',
      actorName: 'Rina Patel',
      happenedAt: '2026-03-22T09:00:00Z',
      source: 'audit' as const,
      entityType: 'assessment_version' as const,
      entityId: 'version-3',
      entityName: 'Sonartra Signals v1.3.0',
      entitySecondary: 'assessment-1',
    },
  ],
  diagnostics: {
    versionCount: 3,
    draftCount: 1,
    archivedCount: 1,
    latestDraftVersionLabel: '1.3.0',
    latestPublishedVersionLabel: '1.2.0',
    latestVersionUpdatedAt: '2026-03-22T09:00:00Z',
  },
}

test('assessment registry renders simplified framing, summary cards, and a single upload CTA', () => {
  const html = renderToStaticMarkup(<AdminAssessmentsRegistrySurface data={registryData} />)

  assert.match(html, /Assessment Registry/)
  assert.match(html, /Manage your assessments, upload new packages, and control what’s live\./)
  assert.match(html, /Upload Assessment Package/)
  assert.doesNotMatch(html, /Import assessment package/)
  assert.doesNotMatch(html, /Operational registry/)
  assert.doesNotMatch(html, /Assessment registry workspace/)
  assert.doesNotMatch(html, /Server-rendered registry view/)
  assert.match(html, /Published Assessments/)
  assert.match(html, /Draft Assessments/)
  assert.match(html, /Archived Assessments/)
  assert.match(html, /Live and available to users\./)
  assert.match(html, /In progress and not yet live\./)
  assert.match(html, /No longer active in the registry\./)
  assert.match(html, /All Assessments/)
  assert.match(html, /Sonartra Signals/)
  assert.match(html, /sonartra_signals/)
  assert.match(html, /No published version|v1.2.0/)
  assert.match(html, /\/admin\/assessments\/assessment-1/)
})

test('assessment detail overview renders workspace tabs, metadata, and audit action', () => {
  const html = renderToStaticMarkup(<AdminAssessmentDetailSurface detailData={detailData} activeTab="overview" mutation="created" />)

  assert.match(html, /Sonartra Signals/)
  assert.match(html, /sonartra_signals/)
  assert.match(html, /Overview/)
  assert.match(html, /Versions/)
  assert.match(html, /Settings/)
  assert.match(html, /Activity/)
  assert.match(html, /Assessment created successfully\./)
  assert.match(html, /Published version v1.2.0/)
  assert.match(html, /Package spec v1 enabled/)
  assert.match(html, /\/admin\/audit\?entityType=assessment&amp;entityId=assessment-1/)
})

test('assessment package import surface uses simplified operator-friendly copy', async () => {
  const [manualCreateSource, packageImportSource] = await Promise.all([
    readFile(new URL('../components/admin/surfaces/AdminAssessmentCreateForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminAssessmentPackageCreateOrAttachForm.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(manualCreateSource, /Create manual assessment container/)
  assert.match(manualCreateSource, /Package import is now the preferred way/)
  assert.match(packageImportSource, /Upload a package to create a new assessment or add a new version to an existing one\./)
  assert.match(packageImportSource, /← Back to Assessments/)
  assert.match(packageImportSource, /Paste your package or upload a JSON file\. You’ll be able to review it before anything is saved\./)
  assert.match(packageImportSource, /Paste your assessment package JSON here/)
  assert.doesNotMatch(packageImportSource, /Workflow framing/)
  assert.doesNotMatch(packageImportSource, /Identity mutability/)
  assert.doesNotMatch(packageImportSource, /Transitional fallback/)
  assert.doesNotMatch(packageImportSource, /Open manual draft fallback/)
})

test('assessment versions workspace surfaces package evidence and diff snippets', async () => {
  const [surfaceSource, managerSource] = await Promise.all([
    readFile(new URL('../components/admin/surfaces/AdminAssessmentDetailSurface.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionsManager.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(surfaceSource, /AdminAssessmentVersionsManager/)
  assert.match(surfaceSource, /currentPublishedVersionId/)
  assert.match(managerSource, /Control-tower view of version package state/)
  assert.match(managerSource, /getAdminAssessmentVersionControlTowerSummary/)
  assert.match(managerSource, /Compared with v/)
  assert.match(managerSource, /Ready with warnings/)
  assert.match(managerSource, /Import package/)
})

test('assessment activity tab renders shared audit presentation and package events', () => {
  const html = renderToStaticMarkup(<AdminAssessmentDetailSurface detailData={detailData} activeTab="activity" />)

  assert.match(html, /Assessment activity/)
  assert.match(html, /assessment package imported/i)
  assert.match(html, /publish blocked invalid package/i)
  assert.match(html, /Open in shared audit/)
  assert.match(html, /\/admin\/audit\?entityType=assessment&amp;entityId=assessment-1/)
})

test('assessment detail settings tab renders package-aware metadata and compiler controls', () => {
  const html = renderToStaticMarkup(<AdminAssessmentDetailSurface detailData={detailData} activeTab="settings" />)

  assert.match(html, /Assessment settings/)
  assert.match(html, /Assessment ID/)
  assert.match(html, /assessment-1/)
  assert.match(html, /Enabled/)
  assert.match(html, /Package normalization pipeline active/i)
})

test('assessment version detail surface renders simplified operator workflow and reduced activity', async () => {
  const detailHtml = renderToStaticMarkup(<AdminAssessmentVersionDetailSurface detailData={detailData} version={detailData.versions[1]} mutation="package-imported" />)
  const importHtml = renderToStaticMarkup(<AdminAssessmentVersionDetailSurface detailData={detailData} version={detailData.versions[1]} mode="import" />)
  const [versionSurfaceSource, importFormSource, simulationSurfaceSource] = await Promise.all([
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionDetailSurface.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionPackageImportForm.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminAssessmentSimulationWorkspace.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(detailHtml, /Review this version before publishing\./)
  assert.match(detailHtml, /Assessment package uploaded successfully\./)
  assert.match(detailHtml, /Next, run a test to preview the output for this version\./)
  assert.match(detailHtml, /Status/)
  assert.match(detailHtml, /Ready to publish/)
  assert.match(detailHtml, /Version actions/)
  assert.match(detailHtml, /Work through these steps before publishing this version\./)
  assert.match(detailHtml, /Run test/)
  assert.match(detailHtml, /Package summary/)
  assert.match(detailHtml, /Imported by/)
  assert.match(detailHtml, /Imported on/)
  assert.match(detailHtml, /Recent activity/)
  assert.match(detailHtml, /This version is almost ready to publish\./)
  assert.match(detailHtml, /Run a final test, check readiness, and review the notes below before publishing\./)
  assert.match(detailHtml, /Items to review/)
  assert.match(detailHtml, /Issues to fix/)
  assert.match(detailHtml, /Publish blocked for Sonartra Signals v1\.3\.0/)
  assert.doesNotMatch(detailHtml, /Import assessment package/)
  assert.doesNotMatch(detailHtml, /Latest regression suite snapshot/)
  assert.doesNotMatch(detailHtml, /Simulation workspace/)
  assert.doesNotMatch(detailHtml, /Sign off version/)
  assert.doesNotMatch(detailHtml, /Validation evidence/)
  assert.doesNotMatch(detailHtml, /Diff/)
  assert.match(importHtml, /Import assessment package/)
  assert.match(versionSurfaceSource, /Assessment package uploaded successfully\./)
  assert.match(versionSurfaceSource, /Next, run a test to preview the output for this version\./)
  assert.match(versionSurfaceSource, /Review this version before publishing\./)
  assert.match(versionSurfaceSource, /Package summary/)
  assert.match(versionSurfaceSource, /Work through these steps before publishing this version\./)
  assert.match(versionSurfaceSource, /formatOperatorIssueText/)
  assert.doesNotMatch(versionSurfaceSource, /Latest regression suite snapshot/)
  assert.match(importFormSource, /Validation results/)
  assert.match(simulationSurfaceSource, /Import scenarios from previous version/)
  assert.match(simulationSurfaceSource, /Clone an individual scenario/)
  assert.match(simulationSurfaceSource, /Run full suite/)
})

test('assessment version detail surface renders clean no-package state', () => {
  const html = renderToStaticMarkup(<AdminAssessmentVersionDetailSurface detailData={{
    ...detailData,
    versions: [{
      ...detailData.versions[1],
      id: 'version-4',
      versionLabel: '1.4.0',
      packageInfo: {
        status: 'missing' as const,
        schemaVersion: null,
        sourceType: null,
        importedAt: null,
        importedByName: null,
        sourceFilename: null,
        summary: null,
        errors: [],
        warnings: [],
      },
      normalizedPackage: null,
      hasDefinitionPayload: false,
      validationStatus: null,
      latestSuiteSnapshot: null,
      savedScenarios: [],
    }],
  }} version={{
    ...detailData.versions[1],
    id: 'version-4',
    versionLabel: '1.4.0',
    packageInfo: {
      status: 'missing' as const,
      schemaVersion: null,
      sourceType: null,
      importedAt: null,
      importedByName: null,
      sourceFilename: null,
      summary: null,
      errors: [],
      warnings: [],
    },
    normalizedPackage: null,
    hasDefinitionPayload: false,
    validationStatus: null,
    latestSuiteSnapshot: null,
    savedScenarios: [],
  }} />)

  assert.match(html, /No package uploaded/)
  assert.match(html, /Ready to publish/)
  assert.match(html, /No/)
  assert.match(html, /Issues/)
})

test('assessment version detail surface renders invalid-package state cleanly', () => {
  const invalidVersion = {
    ...detailData.versions[1],
    id: 'version-invalid',
    versionLabel: '1.3.1',
    packageInfo: {
      ...detailData.versions[1].packageInfo,
      status: 'invalid' as const,
      summary: null,
      errors: [{ path: 'questions[0].dimensionId', message: 'Question references unknown dimension "missing".' }],
      warnings: [],
    },
    normalizedPackage: null,
    hasDefinitionPayload: false,
    validationStatus: 'invalid',
    latestSuiteSnapshot: null,
    savedScenarios: [],
  }
  const html = renderToStaticMarkup(<AdminAssessmentVersionDetailSurface detailData={{ ...detailData, versions: [invalidVersion, detailData.versions[0]] }} version={invalidVersion} />)

  assert.match(html, /Issues/)
  assert.match(html, /Question references unknown dimension/)
  assert.match(html, /This version is not ready to publish yet\./)
})

test('assessment route helpers normalise tabs and registry filters', () => {
  assert.equal(getAdminAssessmentDetailTab('versions'), 'versions')
  assert.equal(getAdminAssessmentDetailTab('activity'), 'activity')
  assert.equal(getAdminAssessmentDetailTab('unexpected'), 'overview')

  const filters = getAdminAssessmentRegistryFilters({ lifecycle: 'published', category: 'behavioural_intelligence', page: '2' })
  assert.equal(filters.lifecycle, 'published')
  assert.equal(filters.category, 'behavioural_intelligence')
  assert.equal(filters.page, 2)
})

test('assessment version row mapping normalises audit-facing version state and package fields', () => {
  const versions = mapAssessmentVersionRows([{
    id: 'version-1',
    assessment_definition_id: 'assessment-1',
    version_label: '1.0.0',
    lifecycle_status: 'draft',
    source_type: 'manual',
    notes: 'Initial draft',
    has_definition_payload: true,
    definition_payload: normalizedPackage,
    validation_status: 'invalid',
    package_status: 'invalid',
    package_schema_version: 'sonartra-assessment-package/v1',
    package_source_type: 'manual_import',
    package_imported_at: '2026-03-02T09:00:00Z',
    package_source_filename: 'draft.json',
    package_imported_by_name: 'Noah Chen',
    package_validation_report_json: {
      summary: {
        dimensionsCount: 2,
        questionsCount: 2,
        optionsCount: 4,
        scoringRuleCount: 1,
        normalizationRuleCount: 1,
        outputRuleCount: 1,
        localeCount: 1,
      },
      errors: [{ path: 'questions', message: 'At least one question is required.' }],
      warnings: [],
    },
    publish_readiness_status: 'not_ready',
    readiness_check_summary_json: null,
    last_readiness_evaluated_at: null,
    sign_off_status: 'unsigned',
    sign_off_at: null,
    sign_off_by_name: null,
    sign_off_material_updated_at: null,
    release_notes: 'Initial release notes',
    material_updated_at: '2026-03-02T09:00:00Z',
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-02T09:00:00Z',
    published_at: null,
    archived_at: null,
    created_by_name: 'Noah Chen',
    updated_by_name: 'Noah Chen',
    published_by_name: null,
    latest_regression_suite_snapshot_json: {
      executedAt: '2026-03-02T10:00:00Z',
      executedBy: 'Noah Chen',
      baselineVersionId: 'version-0',
      baselineVersionLabel: '0.9.0',
      totalScenarios: 3,
      passedCount: 2,
      warningCount: 1,
      failedCount: 0,
      overallStatus: 'warning',
      summaryText: '2/3 passed · 1 warning(s).',
    },
  }])

  assert.equal(versions[0]?.versionLabel, '1.0.0')
  assert.equal(versions[0]?.lifecycleStatus, 'draft')
  assert.equal(versions[0]?.packageInfo.status, 'invalid')
  assert.equal(versions[0]?.packageInfo.importedByName, 'Noah Chen')
  assert.equal(versions[0]?.normalizedPackage?.questions.length, 2)
  assert.equal(versions[0]?.latestSuiteSnapshot?.overallStatus, 'warning')
})

test('assessment routes and actions wire server data loading, import workflow, and mutation surfaces', async () => {
  const [registryRoute, detailRoute, createRoute, createAction, detailAction, notFoundSource, versionRoute, importRoute, versionNotFoundSource, versionSurfaceSource, importFormSource] = await Promise.all([
    readFile(new URL('../app/admin/assessments/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/new/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/new/actions.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/actions.ts', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/not-found.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/versions/[versionNumber]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/versions/[versionNumber]/import/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/admin/assessments/[assessmentId]/versions/[versionNumber]/not-found.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionDetailSurface.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../components/admin/surfaces/AdminAssessmentVersionPackageImportForm.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(registryRoute, /getAdminAssessmentRegistryData/)
  assert.match(registryRoute, /AdminAssessmentsRegistrySurface/)
  assert.match(detailRoute, /getAdminAssessmentDetailData/)
  assert.match(detailRoute, /AdminAssessmentDetailSurface/)
  assert.match(createRoute, /AdminAssessmentCreateForm/)
  assert.match(createAction, /createAdminAssessment/)
  assert.match(detailAction, /createAdminAssessmentDraftVersion/)
  assert.match(detailAction, /publishAdminAssessmentVersion/)
  assert.match(detailAction, /archiveAdminAssessmentVersion/)
  assert.match(detailAction, /importAdminAssessmentPackage/)
  assert.match(detailAction, /importAdminAssessmentSavedScenarios/)
  assert.match(detailAction, /cloneAdminAssessmentSavedScenario/)
  assert.match(detailAction, /runAdminAssessmentScenarioSuite/)
  assert.match(notFoundSource, /Assessment not found/)
  assert.match(versionRoute, /AdminAssessmentVersionDetailSurface/)
  assert.match(importRoute, /mode="import"/)
  assert.match(versionNotFoundSource, /Assessment version not found/)
  assert.match(versionSurfaceSource, /Package summary/)
  assert.match(versionSurfaceSource, /Version actions/)
  assert.match(importFormSource, /Validate \+ attach package/)
})
