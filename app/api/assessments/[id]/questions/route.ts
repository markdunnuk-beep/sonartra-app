import { NextResponse } from 'next/server';

import { queryDb } from '@/lib/db';
import { getQuestionsByAssessmentId } from '@/lib/question-bank';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { traceAssessmentFlow } from '@/lib/assessment-flow-trace';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    traceAssessmentFlow('api.questions.request', {
      userId: appUser.dbUserId,
      assessmentId: params.id,
    });

    const ownership = await queryDb<{ id: string }>(
      `SELECT id
       FROM assessments
       WHERE id = $1 AND user_id = $2`,
      [params.id, appUser.dbUserId]
    );

    if (!ownership.rows[0]) {
      return NextResponse.json({ error: 'Assessment not found.' }, { status: 404 });
    }

    const response = await getQuestionsByAssessmentId(params.id);

    if (!response) {
      return NextResponse.json({ error: 'Assessment or active question set not found.' }, { status: 404 });
    }

    traceAssessmentFlow('api.questions.response', {
      userId: appUser.dbUserId,
      assessmentId: params.id,
      responseCount: response.responses.length,
      progressCount: response.assessment.progressCount,
    });

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/assessments/[id]/questions failed:', error);

    return NextResponse.json({ error: 'Unable to fetch assessment questions.' }, { status: 500 });
  }
}
