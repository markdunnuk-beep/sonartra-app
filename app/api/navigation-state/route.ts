import { NextResponse } from 'next/server';

import { resolveAdminAccess } from '@/lib/admin/access'
import { canonicalAdminLandingHref } from '@/lib/admin/navigation'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { getNavigationLifecycleState } from '@/lib/server/navigation-state';

export async function GET() {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const [navigation, adminAccess] = await Promise.all([
      getNavigationLifecycleState(appUser.dbUserId),
      resolveAdminAccess(),
    ])

    return NextResponse.json({
      ...navigation,
      admin: adminAccess.isAllowed
        ? {
            visible: true,
            href: canonicalAdminLandingHref,
          }
        : {
            visible: false,
            href: null,
          },
    });
  } catch (error) {
    console.error('GET /api/navigation-state failed:', error);
    return NextResponse.json({ error: 'Unable to resolve navigation state.' }, { status: 500 });
  }
}
