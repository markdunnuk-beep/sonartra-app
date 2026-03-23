import { SaveResponseRequest } from '@/lib/assessment-types'
import { withTransaction } from '@/lib/db'
import { saveV2AssessmentResponse } from '@/lib/server/live-assessment-v2'

interface AssessmentProgressRow {
  id: string
  user_id: string
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned'
  total_questions: number
}

interface SaveAssessmentResponseInput extends Partial<SaveResponseRequest> {
  appUserId: string | null
}

interface SaveAssessmentResponseDependencies {
  withTransaction: typeof withTransaction
}

export type SaveAssessmentResponseResult =
  | { status: 401 | 400 | 404 | 409; body: { error: string } }
  | {
      status: 200
      body:
        | {
            assessmentId: string
            questionId: number
            responseValue: number
            progressCount: number
            progressPercent: number
          }
        | {
            assessmentId: string
            questionId: string
            response: unknown
            progressCount: number
            progressPercent: number
          }
    }

type SaveAssessmentResponseTransactionResult =
  | { status: 404 | 409; error: string }
  | {
      status: 200
      payload: {
        assessmentId: string
        questionId: number
        responseValue: number
        progressCount: number
        progressPercent: number
      }
    }

const defaultDependencies: SaveAssessmentResponseDependencies = {
  withTransaction,
}

export async function saveAssessmentResponse(
  input: SaveAssessmentResponseInput,
  dependencies: Partial<SaveAssessmentResponseDependencies> = {},
): Promise<SaveAssessmentResponseResult> {
  if (!input.appUserId) {
    return { status: 401, body: { error: 'Authentication required.' } }
  }

  if (!input.assessmentId) {
    return { status: 400, body: { error: 'assessmentId is required.' } }
  }

  if (typeof input.questionId === 'string') {
    return saveV2AssessmentResponse({
      assessmentId: input.assessmentId,
      appUserId: input.appUserId,
      questionId: input.questionId,
      response: input.response,
      responseTimeMs: input.responseTimeMs,
    }) as Promise<SaveAssessmentResponseResult>
  }

  if (!input.questionId || !Number.isInteger(input.questionId) || input.questionId < 1 || input.questionId > 80) {
    return { status: 400, body: { error: 'questionId must be an integer between 1 and 80.' } }
  }

  if (!input.responseValue || !Number.isInteger(input.responseValue) || input.responseValue < 1 || input.responseValue > 4) {
    return { status: 400, body: { error: 'responseValue must be an integer between 1 and 4.' } }
  }

  if (
    input.responseTimeMs !== undefined &&
    (!Number.isInteger(input.responseTimeMs) || input.responseTimeMs < 0)
  ) {
    return { status: 400, body: { error: 'responseTimeMs must be a non-negative integer.' } }
  }

  const deps = { ...defaultDependencies, ...dependencies }
  const assessmentId = input.assessmentId
  const questionId = input.questionId
  const responseValue = input.responseValue

  const response = await deps.withTransaction<SaveAssessmentResponseTransactionResult>(async (client) => {
    const assessmentResult = await client.query<AssessmentProgressRow>(
      `SELECT a.id, a.user_id, a.status, av.total_questions
       FROM assessments a
       INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
       WHERE a.id = $1
       FOR UPDATE`,
      [assessmentId],
    )

    const assessment = assessmentResult.rows[0]

    if (!assessment || assessment.user_id !== input.appUserId) {
      return { error: 'Assessment not found.', status: 404 as const }
    }

    if (assessment.status === 'completed') {
      return { error: 'Assessment is already completed and cannot be modified.', status: 409 as const }
    }

    const progressUpdate = await client.query<{ progress_count: number; progress_percent: string }>(
      `WITH response_upsert AS (
         INSERT INTO assessment_responses (
           assessment_id,
           question_id,
           response_value,
           response_time_ms,
           is_changed
         ) VALUES ($1, $2, $3, $4, FALSE)
         ON CONFLICT (assessment_id, question_id)
         DO UPDATE SET
           response_value = EXCLUDED.response_value,
           response_time_ms = EXCLUDED.response_time_ms,
           is_changed = assessment_responses.is_changed
             OR assessment_responses.response_value IS DISTINCT FROM EXCLUDED.response_value,
           updated_at = NOW()
         RETURNING xmax = 0 AS inserted
       )
       UPDATE assessments a
       SET
         progress_count = CASE
           WHEN response_upsert.inserted THEN LEAST(a.progress_count + 1, $5)
           ELSE a.progress_count
         END,
         progress_percent = ROUND(
           (
             CASE
               WHEN response_upsert.inserted THEN LEAST(a.progress_count + 1, $5)
               ELSE a.progress_count
             END
           )::numeric * 100 / $5,
           2
         ),
         current_question_index = GREATEST(a.current_question_index, $2),
         status = CASE WHEN a.status = 'not_started' THEN 'in_progress' ELSE a.status END,
         last_activity_at = NOW(),
         updated_at = NOW()
       FROM response_upsert
       WHERE a.id = $1
       RETURNING a.progress_count, a.progress_percent`,
      [assessmentId, questionId, responseValue, input.responseTimeMs ?? null, assessment.total_questions],
    )

    const progressCount = progressUpdate.rows[0]?.progress_count ?? assessment.total_questions
    const progressPercent = Number(progressUpdate.rows[0]?.progress_percent ?? 100)

    return {
      status: 200 as const,
      payload: {
        assessmentId,
        questionId,
        responseValue,
        progressCount,
        progressPercent,
      },
    }
  })

  if (response.status !== 200) {
    return { status: response.status, body: { error: response.error } }
  }

  return {
    status: response.status,
    body: response.payload,
  }
}
