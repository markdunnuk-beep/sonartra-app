import { LayoutDashboard, ClipboardCheck, UserSquare2, Building2, FileBarChart2, Settings, LogOut } from 'lucide-react'
import { Wordmark } from './Wordmark'
import { clsx } from 'clsx'

const links = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/assessment', label: 'Assessment', icon: ClipboardCheck },
  { href: '/app/results/individual', label: 'Individual Results', icon: UserSquare2 },
  { href: '/app/results/organisation', label: 'Organisation', icon: Building2 },
  { href: '/app/dashboard', label: 'Reports', icon: FileBarChart2 },
  { href: '/app/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="border-b border-border bg-panel/95 p-4 lg:sticky lg:top-0 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r lg:p-5">
      <Wordmark />

      <nav className="mt-8 grid gap-1">
        {links.map(({ href, label, icon: Icon }, idx) => (
          <a
            key={label}
            href={href}
            className={clsx(
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all',
              idx === 0
                ? 'border border-accent/35 bg-accent/10 text-textPrimary'
                : 'text-textSecondary hover:bg-bg hover:text-textPrimary',
            )}
          >
            <Icon size={16} />
            {label}
          </a>
        ))}
      </nav>

      <div className="mt-8 rounded-xl border border-border bg-bg/50 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent/20 text-sm font-semibold text-accent">NK</div>
          <div>
            <p className="text-sm font-medium text-textPrimary">Nadia Karim</p>
            <p className="text-xs text-textSecondary">Chief of Staff</p>
          </div>
        </div>
        <a href="/" className="mt-3 inline-flex items-center gap-2 text-xs text-textSecondary transition-colors hover:text-textPrimary">
          <LogOut size={14} /> Log out
        </a>
      </div>
    </aside>
  )
}
