import { queryDb } from '@/lib/db'

export const REQUIRED_ASSESSMENT_RUNTIME_TABLES = [
  'assessment_question_sets',
  'assessment_questions',
  'assessment_question_options',
  'assessment_option_signal_mappings',
] as const

export const REQUIRED_ASSESSMENT_RUNTIME_TABLE_COLUMNS = {
  assessment_question_sets: ['id', 'assessment_version_id', 'key', 'name', 'description', 'is_active'],
  assessment_questions: ['id', 'question_set_id', 'question_number', 'question_key', 'prompt', 'section_key', 'section_name', 'reverse_scored', 'question_weight_default', 'scoring_family', 'notes', 'is_active', 'metadata_json'],
  assessment_question_options: ['id', 'question_id', 'option_key', 'option_text', 'display_order', 'numeric_value'],
  assessment_option_signal_mappings: ['id', 'question_option_id', 'signal_code', 'signal_weight'],
} as const

export type AssessmentRuntimeTableName = (typeof REQUIRED_ASSESSMENT_RUNTIME_TABLES)[number]

export interface AdminAssessmentRuntimeSchemaCapabilities {
  tables: Record<AssessmentRuntimeTableName, { exists: boolean; columns: Set<string> }>
}

interface AssessmentRuntimeSchemaCapabilityDependencies {
  queryDb: typeof queryDb
}

const defaultAssessmentRuntimeSchemaCapabilityDependencies: AssessmentRuntimeSchemaCapabilityDependencies = {
  queryDb,
}

export function getMissingAssessmentRuntimeTables(capabilities: AdminAssessmentRuntimeSchemaCapabilities): AssessmentRuntimeTableName[] {
  return REQUIRED_ASSESSMENT_RUNTIME_TABLES.filter((tableName) => !capabilities.tables[tableName].exists)
}

export function getMissingAssessmentRuntimeColumns(
  capabilities: AdminAssessmentRuntimeSchemaCapabilities,
): Array<{ tableName: AssessmentRuntimeTableName; columns: string[] }> {
  return REQUIRED_ASSESSMENT_RUNTIME_TABLES.flatMap((tableName) => {
    if (!capabilities.tables[tableName].exists) {
      return []
    }

    const missingColumns = REQUIRED_ASSESSMENT_RUNTIME_TABLE_COLUMNS[tableName].filter(
      (columnName) => !capabilities.tables[tableName].columns.has(columnName),
    )

    return missingColumns.length > 0 ? [{ tableName, columns: missingColumns }] : []
  })
}

export async function getAdminAssessmentRuntimeSchemaCapabilities(
  deps: AssessmentRuntimeSchemaCapabilityDependencies = defaultAssessmentRuntimeSchemaCapabilityDependencies,
): Promise<AdminAssessmentRuntimeSchemaCapabilities> {
  const tableResult = await deps.queryDb<{ table_name: string | null }>(
    `select table_name
     from information_schema.tables
     where table_schema = current_schema()
       and table_name = any($1::text[])`,
    [REQUIRED_ASSESSMENT_RUNTIME_TABLES],
  )

  const existingTableNames = new Set<AssessmentRuntimeTableName>(
    (tableResult.rows ?? []).flatMap((row) => {
      const tableName = row.table_name
      return typeof tableName === 'string' && REQUIRED_ASSESSMENT_RUNTIME_TABLES.includes(tableName as AssessmentRuntimeTableName)
        ? [tableName as AssessmentRuntimeTableName]
        : []
    }),
  )

  const columnsByTable = new Map<AssessmentRuntimeTableName, Set<string>>()

  if (existingTableNames.size > 0) {
    const columnResult = await deps.queryDb<{ table_name: string | null; column_name: string | null }>(
      `select table_name, column_name
       from information_schema.columns
       where table_schema = current_schema()
         and table_name = any($1::text[])`,
      [Array.from(existingTableNames)],
    )

    for (const tableName of existingTableNames) {
      columnsByTable.set(
        tableName,
        new Set(
          (columnResult.rows ?? [])
            .filter((row) => row.table_name === tableName && typeof row.column_name === 'string')
            .map((row) => row.column_name as string),
        ),
      )
    }
  }

  return {
    tables: REQUIRED_ASSESSMENT_RUNTIME_TABLES.reduce((result, tableName) => {
      result[tableName] = {
        exists: existingTableNames.has(tableName),
        columns: columnsByTable.get(tableName) ?? new Set<string>(),
      }
      return result
    }, {} as Record<AssessmentRuntimeTableName, { exists: boolean; columns: Set<string> }>),
  }
}
