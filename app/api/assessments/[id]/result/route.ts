import { NextResponse } from 'next/server';

import { getAssessmentResultReadModel } from '@/lib/server/assessment-result-read';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';

async function resolveAssessmentResultRouteResponse(assessmentId: string, ownerUserId: string) {
  const result = await getAssessmentResultReadModel(assessmentId, ownerUserId);

  if (result.kind === 'not_found') {
    return {
      status: 404,
      body: { error: 'Assessment not found.' },
    };
  }

  return {
    status: 200,
    body: result.body,
  };
}

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    if (!params.id) {
      return NextResponse.json({ error: 'assessmentId is required.' }, { status: 400 });
    }

    const response = await resolveAssessmentResultRouteResponse(params.id, appUser.dbUserId);
    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    console.error('GET /api/assessments/[id]/result failed:', error);
    return NextResponse.json({ error: 'Unable to fetch assessment result.' }, { status: 500 });
  }
}
