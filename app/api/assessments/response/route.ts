import { NextResponse } from 'next/server';

import { SaveResponseRequest } from '@/lib/assessment-types';
import { withTransaction } from '@/lib/db';

interface AssessmentProgressRow {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  assessment_version_id: string;
  total_questions: number;
}

export async function POST(request: Request) {
  try {
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
        `SELECT a.id, a.status, a.assessment_version_id, av.total_questions
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

      if (assessment.status === 'completed') {
        return { error: 'Assessment is already completed and cannot be modified.', status: 409 as const };
      }

      const existingResponse = await client.query<{ response_value: number }>(
        `SELECT response_value
         FROM assessment_responses
         WHERE assessment_id = $1 AND question_id = $2`,
        [body.assessmentId, body.questionId]
      );

      const previousValue = existingResponse.rows[0]?.response_value;
      const isChanged = previousValue !== undefined ? previousValue !== body.responseValue : false;

      await client.query(
        `INSERT INTO assessment_responses (
           assessment_id,
           question_id,
           response_value,
           response_time_ms,
           is_changed
         ) VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (assessment_id, question_id)
         DO UPDATE SET
           response_value = EXCLUDED.response_value,
           response_time_ms = EXCLUDED.response_time_ms,
           is_changed = assessment_responses.is_changed OR EXCLUDED.is_changed,
           updated_at = NOW()`,
        [body.assessmentId, body.questionId, body.responseValue, body.responseTimeMs ?? null, isChanged]
      );

      const progressResult = await client.query<{ progress_count: string }>(
        `SELECT COUNT(*)::int AS progress_count
         FROM assessment_responses
         WHERE assessment_id = $1`,
        [body.assessmentId]
      );

      const progressCount = Number(progressResult.rows[0]?.progress_count ?? 0);
      const progressPercent = Number(((progressCount / assessment.total_questions) * 100).toFixed(2));

      await client.query(
        `UPDATE assessments
         SET
           progress_count = $2,
           progress_percent = $3,
           current_question_index = GREATEST(current_question_index, $4),
           status = CASE WHEN status = 'not_started' THEN 'in_progress' ELSE status END,
           last_activity_at = NOW(),
           updated_at = NOW()
         WHERE id = $1`,
        [body.assessmentId, progressCount, progressPercent, body.questionId]
      );

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
