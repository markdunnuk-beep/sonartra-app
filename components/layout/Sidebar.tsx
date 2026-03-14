import { LayoutDashboard, ClipboardCheck, UserSquare2, Building2, FileBarChart2, Settings } from 'lucide-react'
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
  return (
    <aside className="sticky top-0 z-20 w-full border-b border-border/80 bg-panel/95 p-4 backdrop-blur lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r lg:px-5 lg:py-6">
      <Wordmark />

      <nav className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:mt-10 lg:grid-cols-1">
        {links.map(({ href, label, icon: Icon }) => (
          <a
            key={label}
            href={href}
            className="flex items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 text-sm text-textSecondary transition-all hover:border-border hover:bg-bg/70 hover:text-textPrimary"
          >
            <Icon size={16} />
            <span className="truncate">{label}</span>
          </a>
        ))}
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
