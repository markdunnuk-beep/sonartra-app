import { navLinks } from '@/data/mockData'
import { Wordmark } from './Wordmark'
import { Button } from '@/components/ui/Button'

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Wordmark />
        <nav className="hidden gap-6 text-sm text-textSecondary md:flex">
          {navLinks.map((link) => <a key={link.href} href={link.href} className="hover:text-textPrimary">{link.label}</a>)}
        </nav>
        <div className="flex items-center gap-3">
          <Button href="/login" variant="ghost">Log in</Button>
          <Button href="/signup" className="hidden sm:inline-flex">Get Started</Button>
        </div>
      </div>
    </header>
  )
}
