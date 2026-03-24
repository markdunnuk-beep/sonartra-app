import { queryDb } from '@/lib/db'

interface AssessmentResultSchemaCapabilityDependencies {
  queryDb: typeof queryDb
}

const defaultDependencies: AssessmentResultSchemaCapabilityDependencies = {
  queryDb,
}

let cachedHasReportArtifactColumn: boolean | null = null

export function resetAssessmentResultSchemaCapabilitiesCacheForTests(): void {
  cachedHasReportArtifactColumn = null
}

export async function hasAssessmentResultReportArtifactColumn(
  dependencies: Partial<AssessmentResultSchemaCapabilityDependencies> = {},
): Promise<boolean> {
  if (cachedHasReportArtifactColumn !== null) {
    return cachedHasReportArtifactColumn
  }

  const deps = { ...defaultDependencies, ...dependencies }
  const result = await deps.queryDb<{ has_column: boolean }>(
    `select exists(
       select 1
       from information_schema.columns
       where table_schema = current_schema()
         and table_name = 'assessment_results'
         and column_name = 'report_artifact_json'
     ) as has_column`,
  )

  cachedHasReportArtifactColumn = Boolean(result.rows[0]?.has_column)
  return cachedHasReportArtifactColumn
}

export async function getAssessmentResultReportArtifactSelectProjection(
  columnReference: string,
  dependencies: Partial<AssessmentResultSchemaCapabilityDependencies> = {},
): Promise<string> {
  const hasColumn = await hasAssessmentResultReportArtifactColumn(dependencies)
  if (hasColumn) {
    return columnReference
  }

  return 'NULL::jsonb AS report_artifact_json'
}
