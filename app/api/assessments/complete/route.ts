import { NextResponse } from 'next/server';

import { CompleteAssessmentRequest } from '@/lib/assessment-types';
import { queryDb } from '@/lib/db';
import { completeAssessmentWithResults } from '@/lib/server/assessment-completion';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { traceAssessmentFlow } from '@/lib/assessment-flow-trace';

export async function POST(request: Request) {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CompleteAssessmentRequest>;

    traceAssessmentFlow('api.complete.request', {
      userId: appUser.dbUserId,
      assessmentId: body.assessmentId ?? null,
    });

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

    return NextResponse.json(result.body, { status: result.httpStatus });
  } catch (error) {
    console.error('POST /api/assessments/complete failed:', error);

    return NextResponse.json({ ok: false, error: 'Unable to complete assessment.' }, { status: 500 });
  }
}
