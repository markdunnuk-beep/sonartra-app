// See docs/admin-assessment-version-compatibility.md for the assessment_versions compatibility policy behind these capability-driven read projections.
import {
  hasAssessmentVersionPackageColumn,
  hasAssessmentVersionOptionalGovernanceAndRegressionColumn,
  type AdminAssessmentVersionSchemaCapabilities,
  type AssessmentVersionOptionalPackageColumn,
  type AssessmentVersionOptionalGovernanceOrRegressionColumn,
} from '@/lib/admin/server/assessment-version-schema-capabilities'

interface AssessmentVersionSelectQueryOptions {
  includeAssessmentName?: boolean
  whereClause: string
  orderByClause?: string
  limitClause?: string
}

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

function getOptionalAssessmentVersionPackageExpression(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
  columnName: AssessmentVersionOptionalPackageColumn,
  fallbackSql: string,
): string {
  if (!hasAssessmentVersionPackageColumn(capabilities, columnName)) {
    return fallbackSql
  }

  return `av.${columnName}`
}

function getAssessmentVersionDetailProjectionBlock(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
  options: Pick<AssessmentVersionSelectQueryOptions, 'includeAssessmentName'> = {},
): string {
  const packageStatusColumn = getOptionalAssessmentVersionPackageExpression(
    capabilities,
    'package_status',
    `case
           when av.definition_payload is not null then 'valid'::text
           else 'missing'::text
         end`,
  )
  const packageSchemaVersionColumn = getOptionalAssessmentVersionPackageExpression(capabilities, 'package_schema_version', 'null::text')
  const packageSourceTypeColumn = getOptionalAssessmentVersionPackageExpression(capabilities, 'package_source_type', 'null::text')
  const packageImportedAtColumn = getOptionalAssessmentVersionPackageExpression(capabilities, 'package_imported_at', 'null::timestamptz')
  const packageSourceFilenameColumn = getOptionalAssessmentVersionPackageExpression(capabilities, 'package_source_filename', 'null::text')
  const packageValidationReportColumn = getOptionalAssessmentVersionPackageExpression(capabilities, 'package_validation_report_json', 'null::jsonb')
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
  const packageImportedByNameColumn = hasAssessmentVersionPackageColumn(capabilities, 'package_imported_by_identity_id')
    ? 'package_imported_by.full_name'
    : 'null::text'
  const assessmentNameColumn = options.includeAssessmentName
    ? ',\n         ad.name as assessment_name'
    : ''

  return `av.id,
         av.assessment_definition_id,
         av.version_label,
         av.lifecycle_status,
         av.source_type,
         av.notes,
         (av.definition_payload is not null) as has_definition_payload,
         av.definition_payload,
         av.validation_status,
         ${packageStatusColumn} as package_status,
         ${packageSchemaVersionColumn} as package_schema_version,
         ${packageSourceTypeColumn} as package_source_type,
         ${packageImportedAtColumn} as package_imported_at,
         ${packageSourceFilenameColumn} as package_source_filename,
         ${packageImportedByNameColumn} as package_imported_by_name,
         ${packageValidationReportColumn} as package_validation_report_json,
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
         published_by.full_name as published_by_name${assessmentNameColumn}`
}

function getAssessmentVersionDetailJoinBlock(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
  options: Pick<AssessmentVersionSelectQueryOptions, 'includeAssessmentName'> = {},
): string {
  const signOffJoin = hasAssessmentVersionOptionalGovernanceAndRegressionColumn(capabilities, 'sign_off_by_identity_id')
    ? `
       left join admin_identities sign_off_by on sign_off_by.id = av.sign_off_by_identity_id`
    : ''
  const packageImportedByJoin = hasAssessmentVersionPackageColumn(capabilities, 'package_imported_by_identity_id')
    ? `
       left join admin_identities package_imported_by on package_imported_by.id = av.package_imported_by_identity_id`
    : ''
  const assessmentJoin = options.includeAssessmentName
    ? `
       inner join assessment_definitions ad on ad.id = av.assessment_definition_id`
    : ''

  return `from assessment_versions av${assessmentJoin}
       left join admin_identities created_by on created_by.id = av.created_by_identity_id
       left join admin_identities updated_by on updated_by.id = av.updated_by_identity_id
       left join admin_identities published_by on published_by.id = av.published_by_identity_id${signOffJoin}${packageImportedByJoin}`
}

export function buildAssessmentVersionSelectQuery(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
  options: AssessmentVersionSelectQueryOptions,
): string {
  const orderByClause = options.orderByClause ? `
       order by ${options.orderByClause}` : ''
  const limitClause = options.limitClause ? `
       ${options.limitClause}` : ''

  return `select
         ${getAssessmentVersionDetailProjectionBlock(capabilities, options)}
       ${getAssessmentVersionDetailJoinBlock(capabilities, options)}
       where ${options.whereClause}${orderByClause}${limitClause}`
}

export function buildAssessmentVersionDetailQuery(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
): string {
  return buildAssessmentVersionSelectQuery(capabilities, {
    whereClause: 'av.assessment_definition_id = $1',
    orderByClause: `
         case av.lifecycle_status when 'published' then 0 when 'draft' then 1 else 2 end,
         av.updated_at desc,
         av.version_label desc`.trim(),
  })
}

export function buildAssessmentVersionByIdQuery(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
  options: Pick<AssessmentVersionSelectQueryOptions, 'includeAssessmentName'> = {},
): string {
  return buildAssessmentVersionSelectQuery(capabilities, {
    ...options,
    whereClause: 'av.id = $1 and av.assessment_definition_id = $2',
    limitClause: 'limit 1',
  })
}
