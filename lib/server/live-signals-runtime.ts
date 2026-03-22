import { queryDb } from '@/lib/db'

const LIVE_SIGNALS_ASSESSMENT_KEY = 'sonartra_signals'

type QueryDbLike = (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>

interface LiveSignalsPublishedVersionRow {
  assessment_definition_id: string
  assessment_definition_key: string
  assessment_definition_slug: string
  current_published_version_id: string | null
  assessment_version_id: string | null
  assessment_version_key: string | null
  assessment_version_name: string | null
  total_questions: number | null
  is_active: boolean | null
}

export interface LiveSignalsPublishedVersionResolution {
  assessmentDefinitionId: string
  assessmentDefinitionKey: string
  assessmentDefinitionSlug: string
  currentPublishedVersionId: string
  assessmentVersionId: string
  assessmentVersionKey: string
  assessmentVersionName: string
  totalQuestions: number
  isActive: boolean
}

export async function resolveLiveSignalsPublishedVersion(
  deps: {
    queryDb?: QueryDbLike
  } = {},
): Promise<LiveSignalsPublishedVersionResolution | null> {
  const runQuery = deps.queryDb ?? queryDb
  const result = await runQuery(
    `SELECT
       ad.id AS assessment_definition_id,
       ad.key AS assessment_definition_key,
       ad.slug AS assessment_definition_slug,
       ad.current_published_version_id,
       av.id AS assessment_version_id,
       av.key AS assessment_version_key,
       av.name AS assessment_version_name,
       av.total_questions,
       av.is_active
     FROM assessment_definitions ad
     LEFT JOIN assessment_versions av
       ON av.id = ad.current_published_version_id
      AND av.assessment_definition_id = ad.id
      AND av.lifecycle_status = 'published'
     WHERE ad.key = $1
       AND ad.lifecycle_status = 'published'
     LIMIT 1`,
    [LIVE_SIGNALS_ASSESSMENT_KEY],
  )

  const row = result.rows[0] as LiveSignalsPublishedVersionRow | undefined

  if (
    !row ||
    !row.current_published_version_id ||
    !row.assessment_version_id ||
    !row.assessment_version_key ||
    !row.assessment_version_name ||
    typeof row.total_questions !== 'number' ||
    typeof row.is_active !== 'boolean'
  ) {
    return null
  }

  return {
    assessmentDefinitionId: row.assessment_definition_id,
    assessmentDefinitionKey: row.assessment_definition_key,
    assessmentDefinitionSlug: row.assessment_definition_slug,
    currentPublishedVersionId: row.current_published_version_id,
    assessmentVersionId: row.assessment_version_id,
    assessmentVersionKey: row.assessment_version_key,
    assessmentVersionName: row.assessment_version_name,
    totalQuestions: row.total_questions,
    isActive: row.is_active,
  }
}
