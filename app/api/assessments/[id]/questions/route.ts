import { NextResponse } from 'next/server';

import { queryDb } from '@/lib/db';
import { getQuestionsByAssessmentId } from '@/lib/question-bank';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

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

    return NextResponse.json(response);
  } catch (error) {
    console.error('GET /api/assessments/[id]/questions failed:', error);

    return NextResponse.json({ error: 'Unable to fetch assessment questions.' }, { status: 500 });
  }
}
