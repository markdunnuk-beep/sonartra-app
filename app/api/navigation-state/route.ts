import { NextResponse } from 'next/server';

import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { getNavigationLifecycleState } from '@/lib/server/navigation-state';

export async function GET() {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const navigation = await getNavigationLifecycleState(appUser.dbUserId);

    return NextResponse.json(navigation);
  } catch (error) {
    console.error('GET /api/navigation-state failed:', error);
    return NextResponse.json({ error: 'Unable to resolve navigation state.' }, { status: 500 });
  }
}
