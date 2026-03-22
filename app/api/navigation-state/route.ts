import { NextResponse } from 'next/server';

import { describeDatabaseError, logDatabaseError, logDatabaseSessionDiagnostics } from '@/lib/db';

import { resolveAdminAccess } from '@/lib/admin/access'
import { canonicalAdminLandingHref } from '@/lib/admin/navigation'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { getNavigationLifecycleState } from '@/lib/server/navigation-state';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      await logDatabaseSessionDiagnostics('GET /api/navigation-state database session.', {
        metadata: { route: '/api/navigation-state' },
        onceKey: 'api-navigation-state-production-db-session',
      });
    }

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
    logDatabaseError('GET /api/navigation-state failed.', error, { route: '/api/navigation-state', safeMessage: describeDatabaseError(error) });
    return NextResponse.json({ error: 'Unable to resolve navigation state.' }, { status: 500 });
  }
}
