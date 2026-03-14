'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardCheck, UserSquare2, Building2, FileBarChart2, Settings } from 'lucide-react'
import { clsx } from 'clsx'
import { Wordmark } from './Wordmark'

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
    <aside className="sticky top-0 z-20 w-full border-b border-border/80 bg-panel/95 px-4 py-4 backdrop-blur-md lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <Wordmark />

      <div className="mt-5 hidden text-[11px] font-semibold uppercase tracking-[0.2em] text-textSecondary/80 lg:block">Workspace</div>
      <nav className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:mt-4 lg:grid-cols-1 lg:gap-1.5">
        {links.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href
          return (
            <Link
              key={label}
              href={href}
              className={clsx(
                'group flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-all',
                isActive
                  ? 'border-accent/60 bg-accent/10 text-textPrimary shadow-[inset_0_0_0_1px_rgba(59,130,246,0.16)]'
                  : 'border-transparent text-textSecondary hover:border-border hover:bg-bg/70 hover:text-textPrimary',
              )}
            >
              <Icon size={16} className={clsx('transition-colors', isActive ? 'text-accent' : 'text-textSecondary group-hover:text-textPrimary')} />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mt-5 rounded-xl border border-border/80 bg-bg/60 p-3 text-sm text-textSecondary lg:mt-auto">
        <p className="font-medium text-textPrimary">Nadia Karim</p>
        <p>Chief of Staff</p>
        <a href="/" className="mt-2 inline-block text-accent hover:text-blue-300">
          Log out
        </a>
      </div>
    </aside>
  )
}
