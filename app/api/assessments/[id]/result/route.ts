import { NextResponse } from 'next/server';

import { getAssessmentResultReadModel } from '@/lib/server/assessment-result-read';

async function resolveAssessmentResultRouteResponse(assessmentId: string) {
  const result = await getAssessmentResultReadModel(assessmentId);

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
    if (!params.id) {
      return NextResponse.json({ error: 'assessmentId is required.' }, { status: 400 });
    }

    const response = await resolveAssessmentResultRouteResponse(params.id);
    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    console.error('GET /api/assessments/[id]/result failed:', error);
    return NextResponse.json({ error: 'Unable to fetch assessment result.' }, { status: 500 });
  }
}
