import { navLinks } from '@/data/mockData'
import { Wordmark } from './Wordmark'
import { Button } from '@/components/ui/Button'

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/90 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Wordmark />
        <nav className="hidden items-center gap-7 text-sm text-textSecondary lg:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-textPrimary">
              {link.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2 sm:gap-3">
          <Button href="/login" variant="ghost">Log in</Button>
          <Button href="/signup" className="hidden sm:inline-flex">Get Started</Button>
        </div>
      </div>
    </header>
  )
}
