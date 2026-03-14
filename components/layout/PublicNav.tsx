import { SonartraLogo } from '@/components/branding/SonartraLogo'
import { Button } from '@/components/ui/Button'
import { navLinks } from '@/data/mockData'

export function PublicNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between gap-6 px-6">
        <div className="flex items-center gap-8">
          <SonartraLogo href="/" mode="full" size="md" tone="light" priority />
          <nav className="hidden items-center gap-6 text-sm text-textSecondary lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="transition-colors hover:text-textPrimary">
                {link.label}
              </a>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2.5">
          <Button href="/login" variant="ghost" className="hidden sm:inline-flex">
            Log in
          </Button>
          <Button href="/signup">Get Started</Button>
        </div>
      </div>
    </header>
  )
}
