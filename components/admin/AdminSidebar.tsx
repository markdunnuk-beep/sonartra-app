'use client'

import React, { ReactNode } from 'react'
import { SonartraLogo } from '@/components/branding/SonartraLogo'
import { LayoutDashboard, Building2, Users2, ClipboardList, Rocket, FileSearch } from 'lucide-react'
import { AdminAccessContext } from '@/lib/admin/access'
import { AdminNavigationIconKey, AdminNavigationItem } from '@/lib/admin/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function formatAccessSource(accessSource: AdminAccessContext['accessSource']) {
  return accessSource === 'email_allowlist' ? 'Email allowlist' : 'No access source'
}

const navigationIcons: Record<AdminNavigationIconKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  organisations: Building2,
  users: Users2,
  assessments: ClipboardList,
  releases: Rocket,
  audit: FileSearch,
}

export function AdminSidebar({
  access,
  navigationItems,
  isCollapsed = false,
  currentPathname,
  brandLogo,
}: {
  access: AdminAccessContext
  navigationItems: AdminNavigationItem[]
  isCollapsed?: boolean
  currentPathname?: string
  brandLogo?: ReactNode
}) {
  const pathname = currentPathname ?? usePathname()

  const logo = brandLogo ?? <SonartraLogo mode="mark" size="md" tone="light" href="/admin" />

  return (
    <aside
      className={clsx(
        'sticky top-0 z-20 w-full border-b border-border/80 bg-panel/95 px-4 py-5 backdrop-blur-md transition-[padding,width] duration-200 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:py-7',
        isCollapsed ? 'lg:w-24 lg:px-3' : 'lg:px-5',
      )}
      data-sidebar-state={isCollapsed ? 'collapsed' : 'expanded'}
    >
      <div className={clsx('flex items-center justify-between', isCollapsed ? 'lg:flex-col lg:justify-start lg:gap-4' : 'lg:justify-start')}>
        {logo}
        <div className={clsx('min-w-0', isCollapsed ? 'ml-0 lg:hidden' : 'ml-3')}>
          <p className="text-sm font-semibold tracking-tight text-textPrimary">Sonartra Admin</p>
          <p className="eyebrow mt-0.5">Control System</p>
        </div>
        {isCollapsed ? (
          <p className="hidden text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-textSecondary/75 lg:block">
            Admin
          </p>
        ) : null}
      </div>

      <div className={clsx('eyebrow mt-7 hidden lg:block', isCollapsed && 'text-center')}>Control surface</div>
      <nav className="mt-3 grid grid-cols-1 gap-2 lg:mt-4 lg:gap-1.5" aria-label="Admin primary">
        {navigationItems.map(({ href, label, iconKey, startsWith, requiredCapabilities }) => {
          const Icon = navigationIcons[iconKey]
          const isActive =
            href === '/admin'
              ? pathname === href || pathname.startsWith('/admin/dashboard')
              : startsWith
                ? pathname.startsWith(startsWith)
                : pathname === href

          return (
            <Link
              key={label}
              href={href}
              title={isCollapsed ? label : undefined}
              aria-label={isCollapsed ? label : undefined}
              className={clsx(
                'group flex rounded-xl border text-sm transition-all',
                isCollapsed ? 'items-center justify-center px-2 py-3 lg:min-h-14' : 'items-center gap-3 px-3 py-2.5',
                isActive
                  ? 'border-accent/50 bg-accent/10 text-textPrimary shadow-[inset_0_0_0_1px_rgba(76,159,255,0.18)]'
                  : 'border-transparent text-textSecondary hover:border-border/80 hover:bg-bg/60 hover:text-textPrimary',
              )}
              data-active={isActive ? 'true' : 'false'}
            >
              <Icon
                size={16}
                className={clsx(
                  'shrink-0 transition-colors',
                  isActive ? 'text-accent' : 'text-textSecondary group-hover:text-textPrimary',
                )}
              />
              <div className={clsx('min-w-0 flex-1', isCollapsed && 'hidden')}>
                <span className="block truncate">{label}</span>
                <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] text-textSecondary/70">
                  {requiredCapabilities[0]}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>

      <div
        className={clsx(
          'mt-6 rounded-2xl border border-border/80 bg-bg/60 text-sm text-textSecondary lg:mt-auto',
          isCollapsed ? 'hidden lg:block lg:p-3' : 'p-3.5',
        )}
      >
        {isCollapsed ? (
          <div className="space-y-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-textSecondary/75">Role</p>
              <p className="mt-1 text-xs font-medium leading-5 text-textPrimary">{access.provisionalRole ?? 'Pending'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-textSecondary/75">Source</p>
              <p className="mt-1 text-xs font-medium leading-5 text-textPrimary">{access.accessSource === 'email_allowlist' ? 'Allowlist' : 'Pending'}</p>
            </div>
          </div>
        ) : (
          <>
            <p className="text-xs uppercase tracking-[0.16em] text-textSecondary/80">Access context</p>
            <div className="mt-3 grid gap-3">
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary/75">Provisional role</p>
                <p className="mt-1 font-medium text-textPrimary">{access.provisionalRole ?? 'Access pending'}</p>
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary/75">Access source</p>
                <p className="mt-1 font-medium text-textPrimary">{formatAccessSource(access.accessSource)}</p>
              </div>
              <p className="text-sm leading-6 text-textSecondary">
                Bootstrap access remains separate from customer tenant roles so later RBAC and policy controls can evolve without reworking the shell.
              </p>
            </div>
          </>
        )}
      </div>
    </aside>
  )
}
