import { SonartraLogo } from '@/components/branding/SonartraLogo'
import { Button } from '@/components/ui/Button'
import { navLinks } from '@/data/mockData'

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/70 bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-5 px-6 py-4">
        <SonartraLogo href="/" mode="full" size="md" tone="light" className="h-8" priority />

        <nav className="hidden items-center gap-7 text-sm text-textSecondary md:flex">
          {navLinks.map((link) => (
            <a key={link.href} href={link.href} className="transition-colors hover:text-textPrimary">
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <Button href="/login" variant="ghost">
            Log in
          </Button>
          <Button href="/signup" className="hidden sm:inline-flex">
            Get Started
          </Button>
        </div>
      </div>
    </header>
  )
}
