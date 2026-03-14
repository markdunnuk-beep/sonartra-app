import { LayoutDashboard, ClipboardCheck, UserSquare2, Building2, FileBarChart2, Settings } from 'lucide-react'
import { Wordmark } from './Wordmark'

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
    <aside className="w-full border-b border-border bg-panel p-4 lg:h-screen lg:w-72 lg:border-b-0 lg:border-r">
      <Wordmark />
      <nav className="mt-8 grid gap-2">
        {links.map(({ href, label, icon: Icon }) => (
          <a key={label} href={href} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-textSecondary hover:bg-bg hover:text-textPrimary">
            <Icon size={16} />{label}
          </a>
        ))}
      </nav>
      <div className="mt-8 rounded-lg border border-border p-3 text-sm text-textSecondary lg:mt-auto">
        <p className="font-medium text-textPrimary">Nadia Karim</p>
        <p>Chief of Staff</p>
        <a href="/" className="mt-2 inline-block text-accent">Log out</a>
      </div>
    </aside>
  )
}
