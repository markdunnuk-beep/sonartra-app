import { NextResponse } from 'next/server';

import { SaveResponseRequest } from '@/lib/assessment-types';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { saveAssessmentResponse } from '@/lib/server/save-assessment-response';

export async function POST(request: Request) {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<SaveResponseRequest>;

    const response = await saveAssessmentResponse({
      appUserId: appUser?.dbUserId ?? null,
      ...body,
    })

    return NextResponse.json(response.body, { status: response.status });
  } catch (error) {
    console.error('POST /api/assessments/response failed:', error);

    return NextResponse.json({ error: 'Unable to save assessment response.' }, { status: 500 });
  }
}
