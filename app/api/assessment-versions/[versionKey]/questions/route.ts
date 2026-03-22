import { NextResponse } from 'next/server';

import { logDatabaseError } from '@/lib/db';

import { getQuestionsByVersionKey } from '@/lib/question-bank';

export async function GET(_: Request, { params }: { params: { versionKey: string } }) {
  try {
    const response = await getQuestionsByVersionKey(params.versionKey);

    if (!response) {
      return NextResponse.json(
        { error: `No active question set found for assessment version '${params.versionKey}'.` },
        { status: 404 }
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    logDatabaseError('GET /api/assessment-versions/[versionKey]/questions failed.', error, { route: '/api/assessment-versions/[versionKey]/questions' });

    return NextResponse.json({ error: 'Unable to fetch assessment questions.' }, { status: 500 });
  }
}
