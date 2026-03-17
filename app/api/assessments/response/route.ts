import { NextResponse } from 'next/server';

import { SaveResponseRequest } from '@/lib/assessment-types';
import { withTransaction } from '@/lib/db';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { logAssessmentDiagnostic } from '@/lib/server/assessment-diagnostics';

interface AssessmentProgressRow {
  id: string;
  user_id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  total_questions: number;
}

export async function POST(request: Request) {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<SaveResponseRequest>;

    if (!body.assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required.' }, { status: 400 });
    }

    if (!body.questionId || !Number.isInteger(body.questionId) || body.questionId < 1 || body.questionId > 80) {
      return NextResponse.json({ error: 'questionId must be an integer between 1 and 80.' }, { status: 400 });
    }

    if (!body.responseValue || !Number.isInteger(body.responseValue) || body.responseValue < 1 || body.responseValue > 4) {
      return NextResponse.json({ error: 'responseValue must be an integer between 1 and 4.' }, { status: 400 });
    }

    if (
      body.responseTimeMs !== undefined &&
      (!Number.isInteger(body.responseTimeMs) || body.responseTimeMs < 0)
    ) {
      return NextResponse.json({ error: 'responseTimeMs must be a non-negative integer.' }, { status: 400 });
    }

    const response = await withTransaction(async (client) => {
      const assessmentResult = await client.query<AssessmentProgressRow>(
        `SELECT a.id, a.user_id, a.status, av.total_questions
         FROM assessments a
         INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
         WHERE a.id = $1
         FOR UPDATE`,
        [body.assessmentId]
      );

      const assessment = assessmentResult.rows[0];

      if (!assessment) {
        return { error: 'Assessment not found.', status: 404 as const };
      }

      if (assessment.user_id !== appUser.dbUserId) {
        return { error: 'Assessment not found.', status: 404 as const };
      }

      if (assessment.status === 'completed') {
        return { error: 'Assessment is already completed and cannot be modified.', status: 409 as const };
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
        [body.assessmentId, body.questionId, body.responseValue, body.responseTimeMs ?? null, assessment.total_questions]
      );

      const progressCount = progressUpdate.rows[0]?.progress_count ?? assessment.total_questions;
      const progressPercent = Number(progressUpdate.rows[0]?.progress_percent ?? 100);


      const persistedCountResult = await client.query<{ response_count: string }>(
        `SELECT COUNT(*)::int AS response_count
         FROM assessment_responses
         WHERE assessment_id = $1`,
        [body.assessmentId]
      );

      const persistedCount = Number(persistedCountResult.rows[0]?.response_count ?? 0);
      logAssessmentDiagnostic('response.save', {
        assessmentId: body.assessmentId,
        appUserId: appUser.dbUserId,
        questionId: body.questionId,
        responseValue: body.responseValue,
        wroteToDb: true,
        persistedResponseCount: persistedCount,
        progressCount,
        progressPercent,
      });

      return {
        status: 200 as const,
        payload: {
          assessmentId: body.assessmentId,
          questionId: body.questionId,
          responseValue: body.responseValue,
          progressCount,
          progressPercent,
        },
      };
    });

    if ('error' in response) {
      return NextResponse.json({ error: response.error }, { status: response.status });
    }

    return NextResponse.json(response.payload);
  } catch (error) {
    console.error('POST /api/assessments/response failed:', error);

    return NextResponse.json({ error: 'Unable to save assessment response.' }, { status: 500 });
  }
}
