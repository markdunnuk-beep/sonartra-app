import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AdminAccessDenied } from '@/components/admin/AdminAccessDenied'
import { AdminShell } from '@/components/admin/AdminShell'
import { resolveAdminAccess } from '@/lib/admin/access'
import { getAdminNavigationItems } from '@/lib/admin/navigation'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const access = await resolveAdminAccess()

  if (!access.isAuthenticated) {
    redirect('/sign-in')
  }

  if (!access.isAllowed) {
    return <AdminAccessDenied email={access.email} allowlistConfigured={access.allowlist.length > 0} />
  }

  return <AdminShell access={access} navigationItems={getAdminNavigationItems(access)}>{children}</AdminShell>
}
