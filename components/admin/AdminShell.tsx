'use client'

import React, { ReactNode } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { AdminSidebar } from '@/components/admin/AdminSidebar'
import { AdminShellProductModeSwitch } from '@/components/admin/AdminShellProductModeSwitch'
import { AdminShellUtilityBar } from '@/components/admin/AdminShellUtilityBar'
import { Button } from '@/components/ui/Button'
import { AdminAccessContext } from '@/lib/admin/access'
import { AdminNavigationItem } from '@/lib/admin/navigation'
import { useAdminSidebarPreference } from '@/lib/admin/sidebar-state'
import { clsx } from 'clsx'

export function AdminShell({
  children,
  access,
  navigationItems,
  currentPathname,
  productHref,
  brandLogo,
}: {
  children: ReactNode
  access: AdminAccessContext
  navigationItems: AdminNavigationItem[]
  currentPathname?: string
  productHref?: string
  brandLogo?: ReactNode
}) {
  const { isCollapsed, toggleCollapsed } = useAdminSidebarPreference()

  return (
    <div
      className={clsx(
        'min-h-screen bg-bg lg:grid',
        isCollapsed ? 'lg:grid-cols-[96px_minmax(0,1fr)]' : 'lg:grid-cols-[320px_minmax(0,1fr)]',
      )}
      data-sidebar-collapsed={isCollapsed ? 'true' : 'false'}
    >
      <AdminSidebar access={access} navigationItems={navigationItems} isCollapsed={isCollapsed} currentPathname={currentPathname} brandLogo={brandLogo} />
      <main
        className={clsx(
          'min-h-screen pb-10 pt-6 sm:px-6 lg:pb-14 lg:pt-8',
          isCollapsed ? 'px-4 lg:px-7 xl:px-8' : 'px-4 lg:px-8 xl:px-10',
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-3 sm:mb-6">
          <Button
            type="button"
            variant="ghost"
            className="min-h-9 px-3"
            onClick={() => {
              toggleCollapsed()
            }}
          >
            {isCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            <span className="sr-only">{isCollapsed ? 'Expand admin navigation rail' : 'Collapse admin sidebar'}</span>
          </Button>
          {productHref ? <AdminShellUtilityBar productHref={productHref} /> : <AdminShellProductModeSwitch />}
        </div>
        {children}
      </main>
    </div>
  )
}
