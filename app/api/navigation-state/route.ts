import { NextResponse } from 'next/server';

import { doesUserHaveCompletedResult } from '@/lib/server/navigation-state';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';

export async function GET() {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const hasCompletedAssessment = await doesUserHaveCompletedResult(appUser.dbUserId);

    return NextResponse.json({ hasCompletedAssessment });
  } catch (error) {
    console.error('GET /api/navigation-state failed:', error);
    return NextResponse.json({ error: 'Unable to resolve navigation state.' }, { status: 500 });
  }
}
