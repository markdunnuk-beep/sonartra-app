import { AssessmentVersionRow } from '@/lib/assessment-types'
import { queryDb, withTransaction } from '@/lib/db'
import type { AuthenticatedAppUser } from '@/lib/server/auth'

const LIVE_SIGNALS_ASSESSMENT_KEY = 'sonartra_signals'

type QueryDb = typeof queryDb

type WithTransaction = typeof withTransaction

interface StartAssessmentInput {
  appUser: AuthenticatedAppUser | null
  source?: string
}

interface PublishedAssessmentVersionRow extends AssessmentVersionRow {
  assessment_definition_id: string
}

interface ExistingAssessmentRow {
  id: string
  version_id: string
  version_key: string
  version_name: string
  total_questions: number
}

interface StartAssessmentDependencies {
  queryDb: QueryDb
  withTransaction: WithTransaction
}

export interface StartLiveSignalsAssessmentSuccess {
  assessmentId: string
  resumed: boolean
  version: {
    id: string
    key: string
    name: string
    totalQuestions: number
  }
}

export type StartLiveSignalsAssessmentResult =
  | { kind: 'unauthenticated'; status: 401; body: { error: string } }
  | { kind: 'unavailable'; status: 404; body: { error: string } }
  | { kind: 'ok'; status: 200 | 201; body: StartLiveSignalsAssessmentSuccess }

const defaultDependencies: StartAssessmentDependencies = {
  queryDb,
  withTransaction,
}

function buildVersionPayload(version: Pick<AssessmentVersionRow, 'id' | 'key' | 'name' | 'total_questions'>) {
  return {
    id: version.id,
    key: version.key,
    name: version.name,
    totalQuestions: version.total_questions,
  }
}

export async function startLiveSignalsAssessment(
  input: StartAssessmentInput,
  dependencies: Partial<StartAssessmentDependencies> = {},
): Promise<StartLiveSignalsAssessmentResult> {
  if (!input.appUser) {
    return { kind: 'unauthenticated', status: 401, body: { error: 'Authentication required.' } }
  }

  const deps = { ...defaultDependencies, ...dependencies }
  const appUser = input.appUser

  const versionResult = await deps.queryDb<PublishedAssessmentVersionRow>(
    `SELECT av.id, av.key, av.name, av.total_questions, av.is_active, av.assessment_definition_id
     FROM assessment_definitions ad
     INNER JOIN assessment_versions av ON av.id = ad.current_published_version_id
     WHERE ad.key = $1
       AND ad.lifecycle_status = 'published'
       AND av.lifecycle_status = 'published'
       AND av.is_active = TRUE
     LIMIT 1`,
    [LIVE_SIGNALS_ASSESSMENT_KEY],
  )

  const currentPublishedVersion = versionResult.rows[0]

  if (!currentPublishedVersion) {
    return {
      kind: 'unavailable',
      status: 404,
      body: { error: 'No active published Sonartra Signals version is available.' },
    }
  }

  const existingAssessment = await deps.queryDb<ExistingAssessmentRow>(
    `SELECT a.id,
            av.id AS version_id,
            av.key AS version_key,
            av.name AS version_name,
            av.total_questions
     FROM assessments a
     INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
     WHERE a.user_id = $1
       AND av.assessment_definition_id = $2
       AND a.status IN ('not_started', 'in_progress')
     ORDER BY a.last_activity_at DESC NULLS LAST, a.created_at DESC
     LIMIT 1`,
    [appUser.dbUserId, currentPublishedVersion.assessment_definition_id],
  )

  const resumedAssessment = existingAssessment.rows[0]

  if (resumedAssessment) {
    return {
      kind: 'ok',
      status: 200,
      body: {
        assessmentId: resumedAssessment.id,
        resumed: true,
        version: {
          id: resumedAssessment.version_id,
          key: resumedAssessment.version_key,
          name: resumedAssessment.version_name,
          totalQuestions: resumedAssessment.total_questions,
        },
      },
    }
  }

  const createdAssessment = await deps.withTransaction(async (client) => {
    const result = await client.query<{ id: string }>(
      `INSERT INTO assessments (
        user_id,
        organisation_id,
        assessment_version_id,
        status,
        started_at,
        last_activity_at,
        progress_count,
        progress_percent,
        current_question_index,
        scoring_status,
        source
      ) VALUES ($1, NULL, $2, 'not_started', NOW(), NOW(), 0, 0, 0, 'not_scored', $3)
      RETURNING id`,
      [appUser.dbUserId, currentPublishedVersion.id, input.source ?? 'direct'],
    )

    return result.rows[0]
  })

  return {
    kind: 'ok',
    status: 201,
    body: {
      assessmentId: createdAssessment.id,
      resumed: false,
      version: buildVersionPayload(currentPublishedVersion),
    },
  }
}
