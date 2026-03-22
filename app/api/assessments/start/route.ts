import { NextResponse } from 'next/server'

import { queryDb, withTransaction } from '@/lib/db'
import { resolveAuthenticatedAppUser, type AuthenticatedAppUser } from '@/lib/server/auth'
import { resolveLiveSignalsPublishedVersion, type LiveSignalsPublishedVersionResolution } from '@/lib/server/live-signals-runtime'

type QueryDbLike = (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
type TransactionClientLike = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
}
type WithTransactionLike = <T>(work: (client: TransactionClientLike) => Promise<T>) => Promise<T>

interface ExistingAssessmentRow {
  id: string
  assessment_version_id: string
  assessment_version_key: string
  assessment_version_name: string
  total_questions: number
}

interface StartAssessmentRequestBody {
  source?: string
}

interface StartAssessmentResponseBody {
  assessmentId?: string
  resumed?: boolean
  version?: {
    id: string
    key: string
    name: string
    totalQuestions: number
  }
  error?: string
}

interface StartLiveSignalsAssessmentDeps {
  resolveAuthenticatedAppUser: () => Promise<AuthenticatedAppUser | null>
  resolveLiveSignalsPublishedVersion: () => Promise<LiveSignalsPublishedVersionResolution | null>
  queryDb: QueryDbLike
  withTransaction: WithTransactionLike
}

const defaultDeps: StartLiveSignalsAssessmentDeps = {
  resolveAuthenticatedAppUser,
  resolveLiveSignalsPublishedVersion,
  queryDb,
  withTransaction,
}

export async function startLiveSignalsAssessment(
  body: StartAssessmentRequestBody,
  deps: StartLiveSignalsAssessmentDeps = defaultDeps,
): Promise<{ status: number; body: StartAssessmentResponseBody }> {
  const appUser = await deps.resolveAuthenticatedAppUser()

  if (!appUser) {
    return {
      status: 401,
      body: { error: 'Authentication required.' },
    }
  }

  const version = await deps.resolveLiveSignalsPublishedVersion()

  if (!version || !version.isActive) {
    return {
      status: 404,
      body: { error: 'No active published Sonartra Signals version is available.' },
    }
  }

  const existingAssessment = await deps.queryDb(
    `SELECT
       a.id,
       av.id AS assessment_version_id,
       av.key AS assessment_version_key,
       av.name AS assessment_version_name,
       av.total_questions
     FROM assessments a
     INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
     WHERE a.user_id = $1
       AND av.assessment_definition_id = $2
       AND a.status IN ('not_started', 'in_progress')
     ORDER BY a.last_activity_at DESC NULLS LAST, a.created_at DESC
     LIMIT 1`,
    [appUser.dbUserId, version.assessmentDefinitionId],
  )

  const resumableAssessment = existingAssessment.rows[0] as ExistingAssessmentRow | undefined

  if (resumableAssessment) {
    return {
      status: 200,
      body: {
        assessmentId: resumableAssessment.id,
        resumed: true,
        version: {
          id: resumableAssessment.assessment_version_id,
          key: resumableAssessment.assessment_version_key,
          name: resumableAssessment.assessment_version_name,
          totalQuestions: resumableAssessment.total_questions,
        },
      },
    }
  }

  const createdAssessment = await deps.withTransaction(async (client) => {
    const created = await client.query(
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
      [appUser.dbUserId, version.assessmentVersionId, body.source ?? 'direct'],
    )

    return created.rows[0] as { id: string }
  })

  return {
    status: 201,
    body: {
      assessmentId: createdAssessment.id,
      resumed: false,
      version: {
        id: version.assessmentVersionId,
        key: version.assessmentVersionKey,
        name: version.assessmentVersionName,
        totalQuestions: version.totalQuestions,
      },
    },
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as StartAssessmentRequestBody
    const response = await startLiveSignalsAssessment(body)
    return NextResponse.json(response.body, { status: response.status })
  } catch (error) {
    console.error('POST /api/assessments/start failed:', error)

    return NextResponse.json({ error: 'Unable to start assessment.' }, { status: 500 })
  }
}
