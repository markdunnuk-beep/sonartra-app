import { NextResponse } from 'next/server';

import { CompleteAssessmentRequest } from '@/lib/assessment-types';
import { logDatabaseError, queryDb } from '@/lib/db';
import { completeAssessmentWithResults } from '@/lib/server/assessment-completion';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { markAssignmentCompletionProcessing, markAssignmentFailed, markAssignmentResultReady } from '@/lib/server/assessment-assignments';

export async function POST(request: Request) {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CompleteAssessmentRequest>;

    if (!body.assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required.' }, { status: 400 });
    }

    const ownership = await queryDb<{ id: string }>(
      `SELECT id
       FROM assessments
       WHERE id = $1 AND user_id = $2`,
      [body.assessmentId, appUser.dbUserId]
    );

    if (!ownership.rows[0]) {
      return NextResponse.json({ ok: false, error: 'Assessment not found.' }, { status: 404 });
    }

    const result = await completeAssessmentWithResults(body.assessmentId);

    if (result.body.ok) {
      await markAssignmentCompletionProcessing(body.assessmentId)
      if (result.body.resultStatus === 'succeeded') {
        await markAssignmentResultReady({ assessmentId: body.assessmentId, resultId: result.body.resultId })
      } else if (result.body.resultStatus === 'failed') {
        await markAssignmentFailed({ assessmentId: body.assessmentId, resultId: result.body.resultId })
      }
    }

    return NextResponse.json(result.body, { status: result.httpStatus });
  } catch (error) {
    logDatabaseError('POST /api/assessments/complete failed.', error, { route: '/api/assessments/complete' });

    return NextResponse.json({ ok: false, error: 'Unable to complete assessment.' }, { status: 500 });
  }
}
