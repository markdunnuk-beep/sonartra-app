import { NextResponse } from 'next/server';

import { CompleteAssessmentRequest } from '@/lib/assessment-types';
import { withTransaction } from '@/lib/db';

interface CompletionCheckRow {
  id: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'abandoned';
  total_questions: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CompleteAssessmentRequest>;

    if (!body.assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required.' }, { status: 400 });
    }

    const result = await withTransaction(async (client) => {
      const checkResult = await client.query<CompletionCheckRow>(
        `SELECT a.id, a.status, av.total_questions
         FROM assessments a
         INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
         WHERE a.id = $1
         FOR UPDATE`,
        [body.assessmentId]
      );

      const assessment = checkResult.rows[0];

      if (!assessment) {
        return { status: 404 as const, error: 'Assessment not found.' };
      }

      if (assessment.status === 'completed') {
        return { status: 200 as const, payload: { assessmentId: body.assessmentId, status: 'completed' } };
      }

      const responsesCountResult = await client.query<{ response_count: string }>(
        `SELECT COUNT(*)::int AS response_count
         FROM assessment_responses
         WHERE assessment_id = $1`,
        [body.assessmentId]
      );

      const responseCount = Number(responsesCountResult.rows[0]?.response_count ?? 0);

      if (responseCount < assessment.total_questions) {
        return {
          status: 400 as const,
          error: `Assessment cannot be completed. Expected ${assessment.total_questions} responses, found ${responseCount}.`,
        };
      }

      await client.query(
        `UPDATE assessments
         SET
           status = 'completed',
           completed_at = NOW(),
           last_activity_at = NOW(),
           scoring_status = 'pending',
           progress_count = $2,
           progress_percent = 100,
           current_question_index = GREATEST(current_question_index, $2),
           updated_at = NOW()
         WHERE id = $1`,
        [body.assessmentId, assessment.total_questions]
      );

      return {
        status: 200 as const,
        payload: {
          assessmentId: body.assessmentId,
          status: 'completed',
          scoringStatus: 'pending',
          totalResponses: assessment.total_questions,
        },
      };
    });

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: result.status });
    }

    return NextResponse.json(result.payload);
  } catch (error) {
    console.error('POST /api/assessments/complete failed:', error);

    return NextResponse.json({ error: 'Unable to complete assessment.' }, { status: 500 });
  }
}
