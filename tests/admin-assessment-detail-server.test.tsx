import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminAssessmentDetailSurface } from '../components/admin/surfaces/AdminAssessmentDetailSurface'
import { getAdminAssessmentDetailData } from '../lib/admin/server/assessment-management'
import { DatabaseUnavailableError } from '../lib/db'

function buildMissingRelationError(relationName: string): DatabaseUnavailableError {
  const cause = new Error(`relation "${relationName}" does not exist`) as Error & { code?: string }
  cause.code = '42P01'
  return new DatabaseUnavailableError('Database query failed due to a database error.', cause)
}

test('assessment detail loader falls back to an empty saved-scenarios collection when the optional relation is missing', async () => {
  const queries: string[] = []

  const detailData = await getAdminAssessmentDetailData('assessment-1', {
    queryDb: async (sql) => {
      queries.push(sql)

      if (/from assessment_definitions ad/i.test(sql)) {
        return {
          rows: [{
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
          }],
        } as never
      }

      if (/from assessment_versions av/i.test(sql)) {
        return {
          rows: [{
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
            publish_readiness_status: null,
            readiness_check_summary_json: null,
            last_readiness_evaluated_at: null,
            sign_off_status: null,
            sign_off_at: null,
            sign_off_by_name: null,
            sign_off_material_updated_at: null,
            release_notes: null,
            material_updated_at: null,
            created_at: '2026-03-10T09:00:00Z',
            updated_at: '2026-03-21T09:00:00Z',
            published_at: '2026-03-15T09:00:00Z',
            archived_at: null,
            created_by_name: 'Rina Patel',
            updated_by_name: 'Rina Patel',
            published_by_name: 'Rina Patel',
            latest_regression_suite_snapshot_json: null,
          }],
        } as never
      }

      if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
        throw buildMissingRelationError('assessment_version_saved_scenarios')
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
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

test('assessment detail loader preserves saved scenarios when the optional relation is available', async () => {
  const detailData = await getAdminAssessmentDetailData('assessment-1', {
    queryDb: async (sql) => {
      if (/from assessment_definitions ad/i.test(sql)) {
        return {
          rows: [{
            id: 'assessment-1',
            key: 'wplp_80',
            slug: 'wplp-80',
            name: 'WPLP-80',
            category: 'behavioural_intelligence',
            description: null,
            lifecycle_status: 'draft',
            current_published_version_id: null,
            current_published_version_label: null,
            created_at: '2026-03-01T09:00:00Z',
            updated_at: '2026-03-21T09:00:00Z',
          }],
        } as never
      }

      if (/from assessment_versions av/i.test(sql)) {
        return {
          rows: [{
            id: 'version-1',
            assessment_definition_id: 'assessment-1',
            version_label: '1.1.0',
            lifecycle_status: 'draft',
            source_type: 'manual',
            notes: null,
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
            publish_readiness_status: null,
            readiness_check_summary_json: null,
            last_readiness_evaluated_at: null,
            sign_off_status: null,
            sign_off_at: null,
            sign_off_by_name: null,
            sign_off_material_updated_at: null,
            release_notes: null,
            material_updated_at: null,
            created_at: '2026-03-20T09:00:00Z',
            updated_at: '2026-03-21T09:00:00Z',
            published_at: null,
            archived_at: null,
            created_by_name: 'Rina Patel',
            updated_by_name: 'Rina Patel',
            published_by_name: null,
            latest_regression_suite_snapshot_json: null,
          }],
        } as never
      }

      if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
        return {
          rows: [{
            id: 'scenario-1',
            assessment_version_id: 'version-1',
            version_label: '1.1.0',
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
          }],
        } as never
      }

      throw new Error(`Unexpected query: ${sql}`)
    },
    getScopedAdminAuditActivity: async () => [],
  })

  assert.ok(detailData)
  assert.equal(detailData?.versions[0]?.savedScenarios.length, 1)
  assert.equal(detailData?.versions[0]?.savedScenarios[0]?.name, 'Baseline candidate')
})

test('assessment detail loader still throws unrelated saved-scenarios query failures', async () => {
  await assert.rejects(
    () => getAdminAssessmentDetailData('assessment-1', {
      queryDb: async (sql) => {
        if (/from assessment_definitions ad/i.test(sql)) {
          return {
            rows: [{
              id: 'assessment-1',
              key: 'wplp_80',
              slug: 'wplp-80',
              name: 'WPLP-80',
              category: 'behavioural_intelligence',
              description: null,
              lifecycle_status: 'draft',
              current_published_version_id: null,
              current_published_version_label: null,
              created_at: '2026-03-01T09:00:00Z',
              updated_at: '2026-03-21T09:00:00Z',
            }],
          } as never
        }

        if (/from assessment_versions av/i.test(sql)) {
          return {
            rows: [{
              id: 'version-1',
              assessment_definition_id: 'assessment-1',
              version_label: '1.1.0',
              lifecycle_status: 'draft',
              source_type: 'manual',
              notes: null,
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
              publish_readiness_status: null,
              readiness_check_summary_json: null,
              last_readiness_evaluated_at: null,
              sign_off_status: null,
              sign_off_at: null,
              sign_off_by_name: null,
              sign_off_material_updated_at: null,
              release_notes: null,
              material_updated_at: null,
              created_at: '2026-03-20T09:00:00Z',
              updated_at: '2026-03-21T09:00:00Z',
              published_at: null,
              archived_at: null,
              created_by_name: 'Rina Patel',
              updated_by_name: 'Rina Patel',
              published_by_name: null,
              latest_regression_suite_snapshot_json: null,
            }],
          } as never
        }

        if (/from assessment_version_saved_scenarios scenarios/i.test(sql)) {
          const cause = new Error('permission denied for relation assessment_version_saved_scenarios') as Error & { code?: string }
          cause.code = '42501'
          throw new DatabaseUnavailableError('Database query failed due to a database error.', cause)
        }

        throw new Error(`Unexpected query: ${sql}`)
      },
      getScopedAdminAuditActivity: async () => [],
    }),
    /Database query failed due to a database error/,
  )
})
