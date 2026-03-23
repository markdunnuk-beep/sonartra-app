import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminAssessmentVersionDetailSurface } from '../components/admin/surfaces/AdminAssessmentVersionDetailSurface'
import {
  buildAdminAssessmentPackageImportRedirectTarget,
  normalizeAdminAssessmentPackageImportState,
  type AdminAssessmentDetailData,
  type AdminAssessmentVersionRecord,
} from '../lib/admin/domain/assessment-management'
import { getAdminAssessmentPackagePreviewSummary } from '../lib/admin/domain/assessment-package-review'
import type { SonartraAssessmentPackageV1 } from '../lib/admin/domain/assessment-package'
import examplePackageV2 from './fixtures/package-contract-v2-example.json'

const normalizedPackage: SonartraAssessmentPackageV1 = {
  meta: {
    schemaVersion: 'sonartra-assessment-package/v1',
    assessmentKey: 'signals',
    assessmentTitle: 'Signals',
    versionLabel: '1.0.0',
    defaultLocale: 'en',
  },
  dimensions: [{ id: 'drive', labelKey: 'dimension.drive.label' }],
  questions: [{
    id: 'q1',
    promptKey: 'question.q1.prompt',
    dimensionId: 'drive',
    reverseScored: false,
    weight: 1,
    options: [{ id: 'q1.a', labelKey: 'question.q1.option.a', value: 1, scoreMap: { drive: 1 } }],
  }],
  scoring: { dimensionRules: [{ dimensionId: 'drive', aggregation: 'sum' }] },
  normalization: {
    scales: [{
      id: 'drive-scale',
      dimensionIds: ['drive'],
      range: { min: 0, max: 10 },
      bands: [{ key: 'baseline', min: 0, max: 10, labelKey: 'band.baseline.label' }],
    }],
  },
  outputs: { reportRules: [{ key: 'summary', labelKey: 'output.summary.label', dimensionIds: ['drive'], normalizationScaleId: 'drive-scale' }] },
  language: {
    locales: [{
      locale: 'en',
      text: {
        'dimension.drive.label': 'Drive',
        'question.q1.prompt': 'Question prompt',
        'question.q1.option.a': 'Answer',
        'band.baseline.label': 'Baseline',
        'output.summary.label': 'Summary',
      },
    }],
  },
}

function buildVersion(overrides: Partial<AdminAssessmentVersionRecord> = {}): AdminAssessmentVersionRecord {
  return {
    id: 'version-1',
    assessmentId: 'assessment-1',
    versionLabel: '1.0.0',
    lifecycleStatus: 'draft',
    sourceType: 'import',
    notes: null,
    hasDefinitionPayload: true,
    validationStatus: 'valid_with_warnings',
    packageInfo: {
      status: 'valid_with_warnings',
      schemaVersion: 'sonartra-assessment-package/v1',
      sourceType: 'manual_import',
      importedAt: '2026-03-22T10:00:00Z',
      importedByName: 'Admin User',
      sourceFilename: 'signals.json',
      summary: {
        dimensionsCount: 1,
        questionsCount: 1,
        optionsCount: 1,
        scoringRuleCount: 1,
        normalizationRuleCount: 1,
        outputRuleCount: 1,
        localeCount: 1,
      },
      errors: [],
      warnings: [{ path: 'outputs.reportRules[0]', message: 'Narrative copy is recommended.' }],
    },
    normalizedPackage,
    createdAt: '2026-03-22T09:00:00Z',
    updatedAt: '2026-03-22T10:00:00Z',
    publishedAt: null,
    archivedAt: null,
    createdByName: 'Admin User',
    updatedByName: 'Admin User',
    publishedByName: null,
    latestSuiteSnapshot: null,
    releaseGovernance: {
      readinessStatus: 'ready_with_warnings',
      readinessSummary: null,
      lastReadinessEvaluatedAt: null,
      signOff: {
        status: 'unsigned',
        signedOffBy: null,
        signedOffAt: null,
        isStale: false,
        staleReason: null,
      },
      releaseNotes: null,
    },
    materialUpdatedAt: '2026-03-22T10:00:00Z',
    savedScenarios: [],
    ...overrides,
  }
}

function buildDetailData(version: AdminAssessmentVersionRecord): AdminAssessmentDetailData {
  return {
    assessment: {
      id: 'assessment-1',
      name: 'Signals',
      key: 'signals',
      slug: 'signals',
      category: 'behavioural_intelligence',
      description: null,
      lifecycleStatus: 'draft',
      currentPublishedVersionId: null,
      currentPublishedVersionLabel: null,
      createdAt: '2026-03-22T09:00:00Z',
      updatedAt: '2026-03-22T10:00:00Z',
    },
    versions: [version],
    activity: [{
      id: 'audit-1',
      eventType: 'assessment_package_imported',
      summary: 'Package imported.',
      actorId: 'admin-1',
      actorName: 'Admin User',
      happenedAt: '2026-03-22T10:00:00Z',
      source: 'audit',
      entityType: 'assessment_version',
      entityId: version.id,
      entityName: 'Signals v1.0.0',
      entitySecondary: 'assessment-1',
    }],
    diagnostics: {
      versionCount: 1,
      draftCount: 1,
      archivedCount: 0,
      latestDraftVersionLabel: '1.0.0',
      latestPublishedVersionLabel: null,
      latestVersionUpdatedAt: '2026-03-22T10:00:00Z',
    },
  }
}

test('normalizeAdminAssessmentPackageImportState preserves successful import details', () => {
  const state = normalizeAdminAssessmentPackageImportState({
    status: 'success',
    message: 'Package imported with warnings.',
    validationResult: {
      errors: [],
      warnings: [{ path: 'outputs.reportRules[0]', message: 'Review narrative copy.' }],
    },
  })

  assert.equal(state.status, 'success')
  assert.equal(state.message, 'Package imported with warnings.')
  assert.deepEqual(state.validationResult?.warnings, [{ path: 'outputs.reportRules[0]', message: 'Review narrative copy.' }])
})

test('normalizeAdminAssessmentPackageImportState drops malformed payload fields instead of crashing', () => {
  const state = normalizeAdminAssessmentPackageImportState({
    status: 'error',
    message: 'Import failed.',
    fieldErrors: { packageText: ' Broken JSON ' },
    validationResult: {
      errors: [null, { path: 'questions[0]', message: 'Missing promptKey.' }, { path: '', message: 'skip' }] as never,
      warnings: undefined as never,
    },
  })

  assert.equal(state.status, 'error')
  assert.equal(state.fieldErrors?.packageText, 'Broken JSON')
  assert.deepEqual(state.validationResult?.errors, [{ path: 'questions[0]', message: 'Missing promptKey.' }])
  assert.equal(state.validationResult?.warnings.length, 0)
})

test('buildAdminAssessmentPackageImportRedirectTarget only returns routes when identifiers are present', () => {
  assert.equal(
    buildAdminAssessmentPackageImportRedirectTarget('assessment-1', '1.0.0'),
    '/admin/assessments/assessment-1/versions/1.0.0/import?mutation=package-imported',
  )
  assert.equal(buildAdminAssessmentPackageImportRedirectTarget('assessment-1', ''), null)
  assert.equal(buildAdminAssessmentPackageImportRedirectTarget('', '1.0.0'), null)
})

test('getAdminAssessmentPackagePreviewSummary tolerates malformed runtime package payloads', () => {
  const preview = getAdminAssessmentPackagePreviewSummary({
    packageInfo: {
      status: 'valid',
      schemaVersion: 'sonartra-assessment-package/v1',
      sourceType: 'manual_import',
      importedAt: '2026-03-22T10:00:00Z',
      importedByName: 'Admin User',
      sourceFilename: 'signals.json',
      summary: null,
      errors: undefined as never,
      warnings: undefined as never,
    },
    normalizedPackage: { meta: { schemaVersion: 'broken' } } as never,
  })

  assert.equal(preview.state, 'invalid')
  assert.equal(preview.metrics.questionsCount, 0)
  assert.match(preview.scoringSummary, /cannot be inspected/i)
})

test('getAdminAssessmentPackagePreviewSummary provides a safe compatibility preview for validated v2 imports', () => {
  const preview = getAdminAssessmentPackagePreviewSummary({
    packageInfo: {
      status: 'valid',
      detectedVersion: 'package_contract_v2',
      schemaVersion: 'sonartra-assessment-package/v2',
      sourceType: 'manual_import',
      importedAt: '2026-03-22T10:00:00Z',
      importedByName: 'Admin User',
      sourceFilename: 'signals-v2.json',
      summary: {
        packageName: examplePackageV2.metadata.assessmentName,
        versionLabel: examplePackageV2.metadata.compatibility.packageSemver,
        dimensionsCount: 2,
        questionsCount: 4,
        optionsCount: 0,
        scoringRuleCount: 1,
        normalizationRuleCount: 1,
        outputRuleCount: 2,
        localeCount: 2,
        sectionCount: 2,
        derivedDimensionCount: 1,
      },
      errors: [],
      warnings: [],
    },
    normalizedPackage: examplePackageV2 as never,
  })

  assert.equal(preview.state, 'ready')
  assert.equal(preview.metrics.questionsCount, 4)
  assert.equal(preview.metrics.dimensionsCount, 2)
  assert.match(preview.scoringSummary, /cannot execute v2 scoring/i)
  assert.match(preview.dimensionsSummary, /2 dimensions/i)
})

test('normalizeAdminAssessmentPackageImportState preserves version-aware validation metadata safely', () => {
  const state = normalizeAdminAssessmentPackageImportState({
    status: 'success',
    message: 'Package Contract v2 imported successfully.',
    validationResult: {
      success: true,
      detectedVersion: 'package_contract_v2',
      schemaVersion: 'sonartra-assessment-package/v2',
      packageName: 'Adaptive Workstyle Signals',
      versionLabel: '2.0.0',
      summary: {
        packageName: 'Adaptive Workstyle Signals',
        versionLabel: '2.0.0',
        dimensionsCount: 2,
        questionsCount: 4,
        optionsCount: 0,
        scoringRuleCount: 1,
        normalizationRuleCount: 1,
        outputRuleCount: 2,
        localeCount: 2,
        sectionCount: 2,
      },
      readiness: {
        structurallyValid: true,
        importable: true,
        compilable: true,
        evaluatable: true,
        simulatable: true,
        runtimeExecutable: false,
        liveRuntimeEnabled: false,
        publishable: false,
      },
      errors: [],
      warnings: [],
    },
  })

  assert.equal(state.validationResult?.detectedVersion, 'package_contract_v2')
  assert.equal(state.validationResult?.summary?.sectionCount, 2)
  assert.equal(state.validationResult?.readiness?.compilable, true)
  assert.equal(state.validationResult?.readiness?.runtimeExecutable, false)
  assert.equal(state.validationResult?.packageName, 'Adaptive Workstyle Signals')
})

test('assessment import surface renders inline fallback content when optional fields are missing', () => {
  const malformedVersion = buildVersion({
    packageInfo: {
      status: 'valid_with_warnings',
      schemaVersion: null,
      sourceType: null,
      importedAt: null,
      importedByName: null,
      sourceFilename: null,
      summary: null,
      errors: undefined as never,
      warnings: undefined as never,
    },
    normalizedPackage: { meta: { schemaVersion: 'broken' } } as never,
    latestSuiteSnapshot: undefined as never,
    savedScenarios: undefined as never,
    releaseGovernance: {
      readinessStatus: 'ready_with_warnings',
      readinessSummary: null,
      lastReadinessEvaluatedAt: null,
      signOff: undefined as never,
      releaseNotes: undefined as never,
    },
  })

  const html = renderToStaticMarkup(
    <AdminAssessmentVersionDetailSurface
      detailData={buildDetailData(malformedVersion)}
      version={malformedVersion}
      mode="import"
      mutation="package-imported"
    />,
  )

  assert.match(html, /Assessment package imported successfully\./)
  assert.match(html, /Import assessment package/)
  assert.match(html, /Package preview unavailable|No package attached/)
  assert.match(html, /No internal release notes recorded yet\./)
})
