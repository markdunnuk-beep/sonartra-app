import { ReactNode } from 'react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminAccessContext } from '@/lib/admin/access'
import { AdminNavigationItem } from '@/lib/admin/navigation'

export function AdminShell({
  children,
  access,
  navigationItems,
}: {
  children: ReactNode
  access: AdminAccessContext
  navigationItems: AdminNavigationItem[]
}) {
  return (
    <div className="min-h-screen bg-bg lg:grid lg:grid-cols-[320px_minmax(0,1fr)]">
      <AdminSidebar access={access} navigationItems={navigationItems} />
      <main className="min-h-screen px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-14 lg:pt-8 xl:px-10">{children}</main>
    </div>
  )
}
