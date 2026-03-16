import { NextResponse } from 'next/server';

import { getQuestionsByAssessmentId } from '@/lib/question-bank';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
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
