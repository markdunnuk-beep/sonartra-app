import { NextResponse } from 'next/server';

import { CompleteAssessmentRequest } from '@/lib/assessment-types';
import { completeAssessmentWithResults } from '@/lib/server/assessment-completion';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<CompleteAssessmentRequest>;

    if (!body.assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required.' }, { status: 400 });
    }

    const result = await completeAssessmentWithResults(body.assessmentId);

    return NextResponse.json(result.body, { status: result.httpStatus });
  } catch (error) {
    console.error('POST /api/assessments/complete failed:', error);

    return NextResponse.json({ ok: false, error: 'Unable to complete assessment.' }, { status: 500 });
  }
}
