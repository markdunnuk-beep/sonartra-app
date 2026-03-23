import { compileAssessmentPackageV2 } from '@/lib/admin/domain/assessment-package-v2-compiler'
import {
  SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2,
  parseStoredValidatedAssessmentPackageV2,
} from '@/lib/admin/domain/assessment-package-v2'
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
  active_question_set_id: string | null
  active_question_count: number
  questions_with_runtime_metadata: number
  package_schema_version: string | null
  package_status: string | null
  definition_payload: unknown
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
  contractVersion?: 'legacy_v1' | 'package_contract_v2'
}

export type LiveSignalsPublishedVersionDiagnosticCode =
  | 'no_published_version'
  | 'runtime_not_materialized'
  | 'runtime_question_count_mismatch'
  | 'runtime_metadata_mismatch'
  | 'package_not_live_runtime_enabled'
  | 'package_not_compilable'
  | 'package_invalid'

export interface LiveSignalsPublishedVersionDiagnostic {
  code: LiveSignalsPublishedVersionDiagnosticCode
  message: string
}

export interface LiveSignalsPublishedVersionState {
  version: LiveSignalsPublishedVersionResolution | null
  diagnostic: LiveSignalsPublishedVersionDiagnostic
}

function buildUnavailableState(
  diagnostic: LiveSignalsPublishedVersionDiagnostic,
): LiveSignalsPublishedVersionState {
  return {
    version: null,
    diagnostic,
  }
}

export async function resolveLiveSignalsPublishedVersionState(
  deps: {
    queryDb?: QueryDbLike
  } = {},
): Promise<LiveSignalsPublishedVersionState> {
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
       av.is_active,
       av.package_schema_version,
       av.package_status,
       av.definition_payload,
       qs.id AS active_question_set_id,
       COUNT(DISTINCT q.id)::int AS active_question_count,
       COUNT(DISTINCT CASE
         WHEN q.metadata_json ? 'packageQuestionId'
          AND q.metadata_json ? 'promptKey'
          AND q.metadata_json ? 'dimensionId'
         THEN q.id
         ELSE NULL
       END)::int AS questions_with_runtime_metadata
     FROM assessment_definitions ad
     LEFT JOIN assessment_versions av
       ON av.id = ad.current_published_version_id
      AND av.assessment_definition_id = ad.id
      AND av.lifecycle_status = 'published'
     LEFT JOIN assessment_question_sets qs
       ON qs.assessment_version_id = av.id
      AND qs.is_active = TRUE
     LEFT JOIN assessment_questions q
       ON q.question_set_id = qs.id
      AND q.is_active = TRUE
     WHERE ad.key = $1
       AND ad.lifecycle_status = 'published'
     GROUP BY
       ad.id,
       ad.key,
       ad.slug,
       ad.current_published_version_id,
       av.id,
       av.key,
       av.name,
       av.total_questions,
       av.is_active,
       av.package_schema_version,
       av.package_status,
       av.definition_payload,
       qs.id
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
    return buildUnavailableState({
      code: 'no_published_version',
      message: 'No active published Sonartra Signals version is available.',
    })
  }

  if (row.package_schema_version === SONARTRA_ASSESSMENT_PACKAGE_SCHEMA_V2) {
    const pkg = parseStoredValidatedAssessmentPackageV2(row.definition_payload)
    if (!pkg || (row.package_status !== 'valid' && row.package_status !== 'valid_with_warnings')) {
      return buildUnavailableState({
        code: 'package_invalid',
        message: 'The published Sonartra Signals Package Contract v2 payload is missing or invalid for live runtime use.',
      })
    }

    const compiled = compileAssessmentPackageV2(pkg)
    if (!compiled.ok || !compiled.executablePackage) {
      return buildUnavailableState({
        code: 'package_not_compilable',
        message: compiled.diagnostics.find((entry) => entry.severity === 'error')?.message
          ?? 'The published Sonartra Signals Package Contract v2 payload could not be compiled for live runtime use.',
      })
    }

    return {
      version: {
        assessmentDefinitionId: row.assessment_definition_id,
        assessmentDefinitionKey: row.assessment_definition_key,
        assessmentDefinitionSlug: row.assessment_definition_slug,
        currentPublishedVersionId: row.current_published_version_id,
        assessmentVersionId: row.assessment_version_id,
        assessmentVersionKey: row.assessment_version_key,
        assessmentVersionName: row.assessment_version_name,
        totalQuestions: pkg.questions.length,
        isActive: row.is_active,
        contractVersion: 'package_contract_v2',
      },
      diagnostic: {
        code: 'no_published_version',
        message: 'No active published Sonartra Signals version is available.',
      },
    }
  }

  if (!row.active_question_set_id) {
    return buildUnavailableState({
      code: 'runtime_not_materialized',
      message: 'The published Sonartra Signals version is not runnable yet because runtime materialization has not completed.',
    })
  }

  if (row.active_question_count !== row.total_questions) {
    return buildUnavailableState({
      code: 'runtime_question_count_mismatch',
      message: `The published Sonartra Signals version is not runnable because runtime materialization produced ${row.active_question_count} active questions but the published version expects ${row.total_questions}.`,
    })
  }

  if (row.questions_with_runtime_metadata !== row.active_question_count) {
    return buildUnavailableState({
      code: 'runtime_metadata_mismatch',
      message: `The published Sonartra Signals version is not runnable because runtime metadata is incomplete for ${row.active_question_count - row.questions_with_runtime_metadata} active question(s).`,
    })
  }

  return {
    version: {
      assessmentDefinitionId: row.assessment_definition_id,
      assessmentDefinitionKey: row.assessment_definition_key,
      assessmentDefinitionSlug: row.assessment_definition_slug,
      currentPublishedVersionId: row.current_published_version_id,
      assessmentVersionId: row.assessment_version_id,
      assessmentVersionKey: row.assessment_version_key,
      assessmentVersionName: row.assessment_version_name,
      totalQuestions: row.total_questions,
      isActive: row.is_active,
      contractVersion: 'legacy_v1',
    },
    diagnostic: {
      code: 'no_published_version',
      message: 'No active published Sonartra Signals version is available.',
    },
  }
}

export async function resolveLiveSignalsPublishedVersion(
  deps: {
    queryDb?: QueryDbLike
  } = {},
): Promise<LiveSignalsPublishedVersionResolution | null> {
  const state = await resolveLiveSignalsPublishedVersionState(deps)
  return state.version
}
