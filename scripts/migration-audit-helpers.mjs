import { buildMigrationPlan } from './migration-runner-helpers.mjs'

export const DEFAULT_AUDIT_SCHEMA_NAME = 'public'
export const DEFAULT_SCHEMA_SANITY_TABLES = Object.freeze([
  'users',
  'schema_migrations',
  'assessment_versions',
  'assessment_question_sets',
  'assessment_questions',
  'assessment_question_options',
  'assessment_option_signal_mappings',
])

export const REQUIRED_SCHEMA_SANITY_COLUMNS = Object.freeze({
  users: Object.freeze([
    'id',
    'external_auth_id',
    'email',
    'first_name',
    'last_name',
    'account_type',
    'created_at',
    'updated_at',
  ]),
  schema_migrations: Object.freeze(['id', 'applied_at']),
  assessment_versions: Object.freeze([
    'id',
    'key',
    'name',
    'total_questions',
    'is_active',
    'publish_readiness_status',
    'sign_off_status',
  ]),
  assessment_question_sets: Object.freeze(['id', 'assessment_version_id', 'key', 'name', 'description', 'is_active']),
  assessment_questions: Object.freeze([
    'id',
    'question_set_id',
    'question_number',
    'question_key',
    'prompt',
    'section_key',
    'section_name',
    'reverse_scored',
    'question_weight_default',
    'scoring_family',
    'notes',
    'metadata_json',
    'is_active',
  ]),
  assessment_question_options: Object.freeze(['id', 'question_id', 'option_key', 'option_text', 'display_order', 'numeric_value']),
  assessment_option_signal_mappings: Object.freeze(['id', 'question_option_id', 'signal_code', 'signal_weight']),
})

export function analyzeRecordedMigrationOrder(migrationFiles, recordedMigrationRows) {
  const migrationIndexByFileName = new Map(migrationFiles.map((fileName, index) => [fileName, index]))
  const recordedKnownSourceRows = recordedMigrationRows.filter((row) => migrationIndexByFileName.has(row.id))
  const anomalies = []

  let previousRow = null
  let previousIndex = -1

  for (const row of recordedKnownSourceRows) {
    const currentIndex = migrationIndexByFileName.get(row.id)

    if (currentIndex < previousIndex && previousRow) {
      anomalies.push({
        previousId: previousRow.id,
        previousAppliedAt: previousRow.applied_at,
        currentId: row.id,
        currentAppliedAt: row.applied_at,
      })
    }

    previousRow = row
    previousIndex = Math.max(previousIndex, currentIndex)
  }

  return {
    recordedKnownSourceRows,
    anomalies,
  }
}

export function analyzeMigrationAuditState({
  migrationFiles,
  legacyDuplicateVersionGroups,
  recordedMigrationRows,
}) {
  const recordedMigrationIds = new Set(recordedMigrationRows.map((row) => row.id))
  const plan = buildMigrationPlan(migrationFiles, recordedMigrationIds)
  const { recordedKnownSourceRows, anomalies: recordedOrderAnomalies } = analyzeRecordedMigrationOrder(
    migrationFiles,
    recordedMigrationRows,
  )

  return {
    ...plan,
    recordedMigrationIds,
    recordedKnownSourceRows,
    recordedOrderAnomalies,
    legacyDuplicateVersionGroups,
    hasFailures:
      plan.pendingMigrationFiles.length > 0
      || plan.recordedButMissingMigrationFiles.length > 0
      || recordedOrderAnomalies.length > 0,
  }
}

export function buildSchemaSanityReport({
  schemaName = DEFAULT_AUDIT_SCHEMA_NAME,
  tableNames = DEFAULT_SCHEMA_SANITY_TABLES,
  existingTableNames,
  columnsByTableName,
}) {
  const tables = tableNames.map((tableName) => {
    const columns = columnsByTableName.get(tableName) ?? []
    const requiredColumns = REQUIRED_SCHEMA_SANITY_COLUMNS[tableName] ?? []
    const missingRequiredColumns = requiredColumns.filter((columnName) => !columns.includes(columnName))

    return {
      schemaName,
      tableName,
      exists: existingTableNames.has(tableName),
      columns,
      requiredColumns,
      missingRequiredColumns,
      isHealthy: existingTableNames.has(tableName) && missingRequiredColumns.length === 0,
    }
  })

  return {
    tables,
    hasFailures: tables.some((table) => !table.isHealthy),
  }
}
