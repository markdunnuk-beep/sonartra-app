'use client'

import { SignOutButton, SignedIn, UserButton } from '@clerk/nextjs'
import { SonartraLogo } from '@/components/branding/SonartraLogo'
import { clsx } from 'clsx'
import { ClipboardCheck, LayoutDashboard, Settings, UserSquare2, Building2, FileBarChart2 } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assessment', label: 'Assessment', icon: ClipboardCheck },
  { href: '/results/individual', label: 'Individual Results', icon: UserSquare2 },
  { href: '/results/organisation', label: 'Organisation', icon: Building2 },
  { href: '/dashboard', label: 'Reports', icon: FileBarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="sticky top-0 z-20 w-full border-b border-border/80 bg-panel/95 px-4 py-5 backdrop-blur-md lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-7">
      <div className="flex items-center justify-between lg:justify-start">
        <SonartraLogo mode="mark" size="md" tone="light" href="/dashboard" />
        <div className="ml-3 min-w-0">
          <p className="text-sm font-semibold tracking-tight text-textPrimary">Sonartra Workspace</p>
          <p className="eyebrow mt-0.5">Executive Console</p>
        </div>
      </div>

      <div className="eyebrow mt-7 hidden lg:block">Navigation</div>
      <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:mt-4 lg:grid-cols-1 lg:gap-1.5">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
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
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      <SignedIn>
        <div className="mt-6 rounded-2xl border border-border/80 bg-bg/60 p-3.5 text-sm text-textSecondary lg:mt-auto">
          <div className="flex items-center gap-2">
            <UserButton afterSignOutUrl="/" />
            <p className="font-medium text-textPrimary">Authenticated user</p>
          </div>
          <SignOutButton>
            <button className="mt-2 inline-block text-accent transition-colors hover:text-[#86beff]">Log out</button>
          </SignOutButton>
        </div>
      </SignedIn>
    </aside>
  )
}
