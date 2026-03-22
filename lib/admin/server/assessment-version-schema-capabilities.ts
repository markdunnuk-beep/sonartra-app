// See docs/admin-assessment-version-compatibility.md for the assessment_versions compatibility policy used by package-era and governance/regression helpers.
import { queryDb } from '@/lib/db'

export const OPTIONAL_ASSESSMENT_VERSION_PACKAGE_COLUMNS = [
  'package_raw_payload',
  'package_schema_version',
  'package_status',
  'package_source_type',
  'package_source_filename',
  'package_imported_at',
  'package_imported_by_identity_id',
  'package_validation_report_json',
] as const

export const ASSESSMENT_VERSION_RELEASE_READINESS_COLUMNS = [
  'publish_readiness_status',
  'readiness_check_summary_json',
  'last_readiness_evaluated_at',
] as const

export const ASSESSMENT_VERSION_RELEASE_SIGN_OFF_COLUMNS = [
  'sign_off_status',
  'sign_off_at',
  'sign_off_by_identity_id',
  'sign_off_material_updated_at',
  'material_updated_at',
] as const

export const ASSESSMENT_VERSION_RELEASE_NOTES_COLUMNS = [
  'release_notes',
] as const

export const ASSESSMENT_VERSION_REGRESSION_SNAPSHOT_COLUMNS = [
  'latest_regression_suite_snapshot_json',
] as const

export const ASSESSMENT_VERSION_PUBLISH_GOVERNANCE_COLUMNS = [
  ...ASSESSMENT_VERSION_RELEASE_READINESS_COLUMNS,
  ...ASSESSMENT_VERSION_RELEASE_SIGN_OFF_COLUMNS,
] as const

export const OPTIONAL_ASSESSMENT_VERSION_GOVERNANCE_AND_REGRESSION_COLUMNS = [
  ...ASSESSMENT_VERSION_RELEASE_READINESS_COLUMNS,
  ...ASSESSMENT_VERSION_RELEASE_SIGN_OFF_COLUMNS,
  ...ASSESSMENT_VERSION_RELEASE_NOTES_COLUMNS,
  ...ASSESSMENT_VERSION_REGRESSION_SNAPSHOT_COLUMNS,
] as const

export type AssessmentVersionOptionalGovernanceOrRegressionColumn =
  (typeof OPTIONAL_ASSESSMENT_VERSION_GOVERNANCE_AND_REGRESSION_COLUMNS)[number]

export type AssessmentVersionOptionalPackageColumn =
  (typeof OPTIONAL_ASSESSMENT_VERSION_PACKAGE_COLUMNS)[number]

export interface AdminAssessmentVersionSchemaCapabilities {
  hasAssessmentVersionsTable: boolean
  assessmentVersionColumns: Set<string>
}

interface AssessmentVersionSchemaCapabilityDependencies {
  queryDb: typeof queryDb
}

const defaultAssessmentVersionSchemaCapabilityDependencies: AssessmentVersionSchemaCapabilityDependencies = {
  queryDb,
}

export function hasAssessmentVersionPackageColumn(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
  columnName: AssessmentVersionOptionalPackageColumn,
): boolean {
  return capabilities.assessmentVersionColumns.has(columnName)
}

export function hasAssessmentVersionOptionalGovernanceAndRegressionColumn(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
  columnName: AssessmentVersionOptionalGovernanceOrRegressionColumn,
): boolean {
  return capabilities.assessmentVersionColumns.has(columnName)
}

export function hasAssessmentVersionOptionalGovernanceAndRegressionSupport(
  capabilities: AdminAssessmentVersionSchemaCapabilities,
): boolean {
  return OPTIONAL_ASSESSMENT_VERSION_GOVERNANCE_AND_REGRESSION_COLUMNS.every((columnName) => capabilities.assessmentVersionColumns.has(columnName))
}

export async function getAdminAssessmentVersionSchemaCapabilities(
  deps: AssessmentVersionSchemaCapabilityDependencies = defaultAssessmentVersionSchemaCapabilityDependencies,
): Promise<AdminAssessmentVersionSchemaCapabilities> {
  const tableResult = await deps.queryDb<{ assessment_versions_schema: string | null }>(
    `select (
       select n.nspname
       from pg_class c
       inner join pg_namespace n on n.oid = c.relnamespace
       where c.oid = to_regclass('assessment_versions')
     ) as assessment_versions_schema`,
  )

  const assessmentVersionsSchema = tableResult.rows[0]?.assessment_versions_schema ?? null
  const hasAssessmentVersionsTable = Boolean(assessmentVersionsSchema)

  if (!hasAssessmentVersionsTable) {
    return {
      hasAssessmentVersionsTable,
      assessmentVersionColumns: new Set<string>(),
    }
  }

  const columnResult = await deps.queryDb<{ column_name: string | null }>(
    `select column_name
     from information_schema.columns
     where table_schema = $1
       and table_name = 'assessment_versions'`,
    [assessmentVersionsSchema],
  )

  return {
    hasAssessmentVersionsTable,
    assessmentVersionColumns: new Set((columnResult.rows ?? []).flatMap((row) => row.column_name ? [row.column_name] : [])),
  }
}
