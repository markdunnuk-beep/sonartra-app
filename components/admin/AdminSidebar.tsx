'use client'

import { SonartraLogo } from '@/components/branding/SonartraLogo'
import { AdminAccessContext } from '@/lib/admin/access'
import { AdminNavigationItem } from '@/lib/admin/navigation'
import { clsx } from 'clsx'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

function formatAccessSource(accessSource: AdminAccessContext['accessSource']) {
  return accessSource === 'email_allowlist' ? 'Email allowlist' : 'No access source'
}

export function AdminSidebar({
  access,
  navigationItems,
}: {
  access: AdminAccessContext
  navigationItems: AdminNavigationItem[]
}) {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 z-20 w-full border-b border-border/80 bg-panel/95 px-4 py-5 backdrop-blur-md lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
      <div className="flex items-center justify-between lg:justify-start">
        <SonartraLogo mode="mark" size="md" tone="light" href="/admin" />
        <div className="ml-3 min-w-0">
          <p className="text-sm font-semibold tracking-tight text-textPrimary">Sonartra Admin</p>
          <p className="eyebrow mt-0.5">Control System</p>
        </div>
      </div>

      <div className="eyebrow mt-7 hidden lg:block">Control surface</div>
      <nav className="mt-3 grid grid-cols-1 gap-2 lg:mt-4 lg:gap-1.5">
        {navigationItems.map(({ href, label, icon: Icon, startsWith, requiredCapabilities }) => {
          const isActive = startsWith ? pathname.startsWith(startsWith) : pathname === href

          return (
            <Link
              key={label}
              href={href}
              className={clsx(
                'group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'border-accent/50 bg-accent/10 text-textPrimary shadow-[inset_0_0_0_1px_rgba(76,159,255,0.18)]'
                  : 'border-transparent text-textSecondary hover:border-border/80 hover:bg-bg/60 hover:text-textPrimary',
              )}
            >
              <Icon size={16} className={clsx('transition-colors', isActive ? 'text-accent' : 'text-textSecondary group-hover:text-textPrimary')} />
              <div className="min-w-0 flex-1">
                <span className="block truncate">{label}</span>
                <span className="mt-0.5 block truncate text-[10px] uppercase tracking-[0.14em] text-textSecondary/70">
                  {requiredCapabilities[0]}
                </span>
              </div>
            </Link>
          )
        })}
      </nav>

      <div className="mt-6 rounded-2xl border border-border/80 bg-bg/60 p-3.5 text-sm text-textSecondary lg:mt-auto">
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
      </div>
    </aside>
  )
}
