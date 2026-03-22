import {
  hasAssessmentVersionOptionalGovernanceAndRegressionColumn,
  type AdminAssessmentVersionSchemaCapabilities,
  type AssessmentVersionOptionalGovernanceOrRegressionColumn,
} from '@/lib/admin/server/assessment-version-schema-capabilities'

function getOptionalAssessmentVersionExpression(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
  columnName: AssessmentVersionOptionalGovernanceOrRegressionColumn,
  fallbackSql: string,
): string {
  if (!hasAssessmentVersionOptionalGovernanceAndRegressionColumn(capabilities, columnName)) {
    return fallbackSql
  }

  return `av.${columnName}`
}

function getAssessmentVersionDetailProjectionBlock(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
): string {
  const publishReadinessStatusColumn = getOptionalAssessmentVersionExpression(capabilities, 'publish_readiness_status', `'not_ready'::text`)
  const readinessCheckSummaryColumn = getOptionalAssessmentVersionExpression(capabilities, 'readiness_check_summary_json', 'null::jsonb')
  const lastReadinessEvaluatedAtColumn = getOptionalAssessmentVersionExpression(capabilities, 'last_readiness_evaluated_at', 'null::timestamptz')
  const signOffStatusColumn = getOptionalAssessmentVersionExpression(capabilities, 'sign_off_status', 'null::text')
  const signOffAtColumn = getOptionalAssessmentVersionExpression(capabilities, 'sign_off_at', 'null::timestamptz')
  const signOffMaterialUpdatedAtColumn = getOptionalAssessmentVersionExpression(capabilities, 'sign_off_material_updated_at', 'null::timestamptz')
  const releaseNotesColumn = getOptionalAssessmentVersionExpression(capabilities, 'release_notes', 'null::text')
  const materialUpdatedAtColumn = getOptionalAssessmentVersionExpression(capabilities, 'material_updated_at', 'av.updated_at')
  const latestRegressionSuiteSnapshotColumn = getOptionalAssessmentVersionExpression(capabilities, 'latest_regression_suite_snapshot_json', 'null::jsonb')
  const signOffByNameColumn = hasAssessmentVersionOptionalGovernanceAndRegressionColumn(capabilities, 'sign_off_by_identity_id')
    ? 'sign_off_by.full_name'
    : 'null::text'

  return `av.id,
         av.assessment_definition_id,
         av.version_label,
         av.lifecycle_status,
         av.source_type,
         av.notes,
         (av.definition_payload is not null) as has_definition_payload,
         av.definition_payload,
         av.validation_status,
         av.package_status,
         av.package_schema_version,
         av.package_source_type,
         av.package_imported_at,
         av.package_source_filename,
         package_imported_by.full_name as package_imported_by_name,
         av.package_validation_report_json,
         ${publishReadinessStatusColumn} as publish_readiness_status,
         ${readinessCheckSummaryColumn} as readiness_check_summary_json,
         ${lastReadinessEvaluatedAtColumn} as last_readiness_evaluated_at,
         ${signOffStatusColumn} as sign_off_status,
         ${signOffAtColumn} as sign_off_at,
         ${signOffByNameColumn} as sign_off_by_name,
         ${signOffMaterialUpdatedAtColumn} as sign_off_material_updated_at,
         ${releaseNotesColumn} as release_notes,
         ${materialUpdatedAtColumn} as material_updated_at,
         ${latestRegressionSuiteSnapshotColumn} as latest_regression_suite_snapshot_json,
         av.created_at,
         av.updated_at,
         av.published_at,
         av.archived_at,
         created_by.full_name as created_by_name,
         updated_by.full_name as updated_by_name,
         published_by.full_name as published_by_name`
}

function getAssessmentVersionDetailJoinBlock(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
): string {
  const signOffJoin = hasAssessmentVersionOptionalGovernanceAndRegressionColumn(capabilities, 'sign_off_by_identity_id')
    ? `
       left join admin_identities sign_off_by on sign_off_by.id = av.sign_off_by_identity_id`
    : ''

  return `from assessment_versions av
       left join admin_identities created_by on created_by.id = av.created_by_identity_id
       left join admin_identities updated_by on updated_by.id = av.updated_by_identity_id
       left join admin_identities published_by on published_by.id = av.published_by_identity_id${signOffJoin}
       left join admin_identities package_imported_by on package_imported_by.id = av.package_imported_by_identity_id`
}

export function buildAssessmentVersionDetailQuery(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
): string {
  return `select
         ${getAssessmentVersionDetailProjectionBlock(capabilities)}
       ${getAssessmentVersionDetailJoinBlock(capabilities)}
       where av.assessment_definition_id = $1
       order by
         case av.lifecycle_status when 'published' then 0 when 'draft' then 1 else 2 end,
         av.updated_at desc,
         av.version_label desc`
}
