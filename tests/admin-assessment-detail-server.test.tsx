import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminAssessmentDetailSurface } from '../components/admin/surfaces/AdminAssessmentDetailSurface'
import { getAdminAssessmentDetailData } from '../lib/admin/server/assessment-management'
import type { AdminAssessmentVersionSchemaCapabilities } from '../lib/admin/server/assessment-version-schema-capabilities'
import { DatabaseUnavailableError } from '../lib/db'

function buildMissingRelationError(relationName: string): DatabaseUnavailableError {
  const cause = new Error(`relation "${relationName}" does not exist`) as Error & { code?: string }
  cause.code = '42P01'
  return new DatabaseUnavailableError('Database query failed due to a database error.', cause)
}

function buildAssessmentVersionSchemaCapabilities(columns: string[]): AdminAssessmentVersionSchemaCapabilities {
  return {
    hasAssessmentVersionsTable: true,
    assessmentVersionColumns: new Set(columns),
  }
}

const MODERN_ASSESSMENT_VERSION_CAPABILITIES = buildAssessmentVersionSchemaCapabilities([
  'publish_readiness_status',
  'readiness_check_summary_json',
  'last_readiness_evaluated_at',
  'sign_off_status',
  'sign_off_at',
  'sign_off_by_identity_id',
  'sign_off_material_updated_at',
  'release_notes',
  'material_updated_at',
  'latest_regression_suite_snapshot_json',
])

const LEGACY_ASSESSMENT_VERSION_CAPABILITIES = buildAssessmentVersionSchemaCapabilities([])

function makeAssessmentSummaryRow() {
  return {
    id: 'assessment-1',
    key: 'wplp_80',
    slug: 'wplp-80',
    name: 'WPLP-80',
    category: 'behavioural_intelligence',
    description: 'Warehouse performance leadership profile.',
    lifecycle_status: 'published',
    current_published_version_id: 'version-1',
    current_published_version_label: '1.0.0',
    created_at: '2026-03-01T09:00:00Z',
    updated_at: '2026-03-21T09:00:00Z',
  }
}

function makeVersionRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'version-1',
    assessment_definition_id: 'assessment-1',
    version_label: '1.0.0',
    lifecycle_status: 'published',
    source_type: 'manual',
    notes: 'Current production release',
    has_definition_payload: false,
    definition_payload: null,
    validation_status: null,
    package_status: null,
    package_schema_version: null,
    package_source_type: null,
    package_imported_at: null,
    package_source_filename: null,
    package_imported_by_name: null,
    package_validation_report_json: null,
    publish_readiness_status: 'ready',
    readiness_check_summary_json: {
      status: 'ready',
      summaryText: 'Ready to publish.',
      checks: [],
      blockingChecks: [],
      warningChecks: [],
    },
    last_readiness_evaluated_at: '2026-03-21T09:10:00Z',
    sign_off_status: 'signed_off',
    sign_off_at: '2026-03-21T09:20:00Z',
    sign_off_by_name: 'Rina Patel',
    sign_off_material_updated_at: '2026-03-21T09:00:00Z',
    release_notes: 'Stable release notes',
    material_updated_at: '2026-03-21T09:00:00Z',
    latest_regression_suite_snapshot_json: {
      executedAt: '2026-03-21T09:15:00Z',
      executedBy: 'Rina Patel',
      baselineVersionId: null,
      baselineVersionLabel: null,
      totalScenarios: 2,
      passedCount: 2,
      warningCount: 0,
      failedCount: 0,
      overallStatus: 'pass',
      summaryText: '2/2 passed.',
    },
    created_at: '2026-03-10T09:00:00Z',
    updated_at: '2026-03-21T09:00:00Z',
    published_at: '2026-03-15T09:00:00Z',
    archived_at: null,
    created_by_name: 'Rina Patel',
    updated_by_name: 'Rina Patel',
    published_by_name: 'Rina Patel',
    ...overrides,
  }
}

function makeSavedScenarioRow() {
  return {
    id: 'scenario-1',
    assessment_version_id: 'version-1',
    version_label: '1.0.0',
    name: 'Baseline candidate',
    description: 'Happy-path regression sample',
    scenario_payload: JSON.stringify({ answers: [] }),
    status: 'active',
    source_version_id: null,
    source_version_label: null,
    source_scenario_id: null,
    provenance_json: null,
    created_at: '2026-03-21T08:00:00Z',
    updated_at: '2026-03-21T08:30:00Z',
    archived_at: null,
    created_by_name: 'Rina Patel',
    updated_by_name: 'Rina Patel',
  }
}

test('assessment detail loader falls back to an empty saved-scenarios collection when the optional relation is missing', async () => {
  const queries: string[] = []

  const detailData = await getAdminAssessmentDetailData('assessment-1', {
    queryDb: async (sql) => {
      queries.push(sql)

      if (/from assessment_definitions ad/i.test(sql)) {
        return { rows: [makeAssessmentSummaryRow()] } as never
      }

      if (/from assessment_versions av/i.test(sql)) {
        return { rows: [makeVersionRow()] } as never
      }

      if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
        throw buildMissingRelationError('assessment_version_saved_scenarios')
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    getScopedAdminAuditActivity: async () => [],
  })

  assert.ok(detailData)
  assert.equal(detailData?.versions.length, 1)
  assert.deepEqual(detailData?.versions[0]?.savedScenarios, [])
  assert.equal(queries.filter((sql) => /from assessment_version_saved_scenarios scenarios/i.test(sql)).length, 1)

  const html = renderToStaticMarkup(<AdminAssessmentDetailSurface detailData={detailData!} activeTab="overview" />)
  assert.match(html, /WPLP-80/)
  assert.doesNotMatch(html, /Application error/i)
})

test('assessment detail loader uses modern capability mode when governance and regression fields are available', async () => {
  const versionQueries: string[] = []

  const detailData = await getAdminAssessmentDetailData('assessment-1', {
    queryDb: async (sql) => {
      if (/from assessment_definitions ad/i.test(sql)) {
        return { rows: [makeAssessmentSummaryRow()] } as never
      }

      if (/from assessment_versions av/i.test(sql)) {
        versionQueries.push(sql)
        return { rows: [makeVersionRow()] } as never
      }

      if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
        return { rows: [makeSavedScenarioRow()] } as never
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
    getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
    getScopedAdminAuditActivity: async () => [],
  })

  const version = detailData?.versions[0]
  assert.ok(version)
  assert.equal(versionQueries.length, 1)
  assert.match(versionQueries[0] ?? '', /av\.latest_regression_suite_snapshot_json/i)
  assert.match(versionQueries[0] ?? '', /av\.sign_off_by_identity_id/i)
  assert.equal(version?.savedScenarios.length, 1)
  assert.equal(version?.savedScenarios[0]?.name, 'Baseline candidate')
  assert.equal(version?.releaseGovernance?.readinessStatus, 'ready')
  assert.equal(version?.releaseGovernance?.signOff.status, 'signed_off')
  assert.equal(version?.releaseGovernance?.signOff.signedOffBy, 'Rina Patel')
  assert.equal(version?.releaseGovernance?.releaseNotes, 'Stable release notes')
  assert.equal(version?.latestSuiteSnapshot?.overallStatus, 'pass')
})

test('assessment detail loader uses legacy capability mode when governance and regression fields are unavailable', async () => {
  const versionQueries: string[] = []

  const detailData = await getAdminAssessmentDetailData('assessment-1', {
    queryDb: async (sql) => {
      if (/from assessment_definitions ad/i.test(sql)) {
        return { rows: [makeAssessmentSummaryRow()] } as never
      }

      if (/from assessment_versions av/i.test(sql)) {
        versionQueries.push(sql)
        return {
          rows: [makeVersionRow({
            publish_readiness_status: 'not_ready',
            readiness_check_summary_json: null,
            last_readiness_evaluated_at: null,
            sign_off_status: null,
            sign_off_at: null,
            sign_off_by_name: null,
            sign_off_material_updated_at: null,
            release_notes: null,
            material_updated_at: '2026-03-21T09:00:00Z',
            latest_regression_suite_snapshot_json: null,
          })],
        } as never
      }

      if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
        return { rows: [] } as never
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
    getAssessmentVersionSchemaCapabilities: async () => LEGACY_ASSESSMENT_VERSION_CAPABILITIES,
    getScopedAdminAuditActivity: async () => [],
  })

  const version = detailData?.versions[0]
  assert.ok(version)
  assert.equal(versionQueries.length, 1)
  assert.doesNotMatch(versionQueries[0] ?? '', /av\.sign_off_by_identity_id/i)
  assert.doesNotMatch(versionQueries[0] ?? '', /av\.latest_regression_suite_snapshot_json/i)
  assert.deepEqual(version?.releaseGovernance?.signOff, {
    status: 'unsigned',
    signedOffBy: null,
    signedOffAt: null,
    isStale: false,
    staleReason: null,
  })
  assert.equal(version?.releaseGovernance?.releaseNotes, null)
  assert.equal(version?.releaseGovernance?.readinessStatus, 'not_ready')
  assert.equal(version?.releaseGovernance?.readinessSummary, null)
  assert.equal(version?.releaseGovernance?.lastReadinessEvaluatedAt, null)
  assert.equal(version?.latestSuiteSnapshot, null)
})

test('assessment detail loader still throws unrelated saved-scenarios query failures', async () => {
  await assert.rejects(
    () => getAdminAssessmentDetailData('assessment-1', {
      queryDb: async (sql) => {
        if (/from assessment_definitions ad/i.test(sql)) {
          return { rows: [makeAssessmentSummaryRow()] } as never
        }

        if (/from assessment_versions av/i.test(sql)) {
          return { rows: [makeVersionRow()] } as never
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          const cause = new Error('permission denied for relation assessment_version_saved_scenarios') as Error & { code?: string }
          cause.code = '42501'
          throw new DatabaseUnavailableError('Database query failed due to a database error.', cause)
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
      getAssessmentVersionSchemaCapabilities: async () => MODERN_ASSESSMENT_VERSION_CAPABILITIES,
      getScopedAdminAuditActivity: async () => [],
    }),
    /Database query failed due to a database error/,
  )
})

test('assessment detail loader still throws unrelated version-query failures', async () => {
  await assert.rejects(
    () => getAdminAssessmentDetailData('assessment-1', {
      queryDb: async (sql) => {
        if (/from assessment_definitions ad/i.test(sql)) {
          return { rows: [makeAssessmentSummaryRow()] } as never
        }

        if (/from assessment_versions av/i.test(sql)) {
          const cause = new Error('permission denied for relation assessment_versions') as Error & { code?: string }
          cause.code = '42501'
          throw new DatabaseUnavailableError('Database query failed due to a database error.', cause)
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          return { rows: [] } as never
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
      getAssessmentVersionSchemaCapabilities: async () => LEGACY_ASSESSMENT_VERSION_CAPABILITIES,
      getScopedAdminAuditActivity: async () => [],
    }),
    /Database query failed due to a database error/,
  )
})
