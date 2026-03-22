import { NextResponse } from 'next/server';

import { AssessmentRow, AssessmentVersionRow } from '@/lib/assessment-types';
import { logDatabaseError, queryDb } from '@/lib/db';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';

interface AssessmentResponseRow {
  question_id: number;
  response_value: number;
  response_time_ms: number | null;
  is_changed: boolean;
  created_at: string;
  updated_at: string;
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const assessmentId = params.id;

    const assessmentResult = await queryDb<AssessmentRow>(
      `SELECT *
       FROM assessments
       WHERE id = $1
         AND user_id = $2`,
      [assessmentId, appUser.dbUserId]
    );

    const assessment = assessmentResult.rows[0];

    if (!assessment) {
      return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
    }

    const versionResult = await queryDb<AssessmentVersionRow>(
      `SELECT id, key, name, total_questions, is_active
       FROM assessment_versions
       WHERE id = $1`,
      [assessment.assessment_version_id]
    );
    const responsesResult = await queryDb<AssessmentResponseRow>(
      `SELECT question_id, response_value, response_time_ms, is_changed, created_at, updated_at
       FROM assessment_responses
       WHERE assessment_id = $1
       ORDER BY question_id ASC`,
      [assessmentId]
    );

    const version = versionResult.rows[0];

    return NextResponse.json({
      assessment,
      version: version
        ? {
            id: version.id,
            key: version.key,
            name: version.name,
            totalQuestions: version.total_questions,
            isActive: version.is_active,
          }
        : null,
      responses: responsesResult.rows,
      progress: {
        count: assessment.progress_count,
        percent: Number(assessment.progress_percent),
        currentQuestionIndex: assessment.current_question_index,
      },
    });
  } catch (error) {
    logDatabaseError('GET /api/assessments/[id] failed.', error, { route: '/api/assessments/[id]' });

    return NextResponse.json({ error: 'Unable to fetch assessment.' }, { status: 500 });
  }
}
