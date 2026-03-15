import { SonartraLogo } from '@/components/branding/SonartraLogo'
import { Button } from '@/components/ui/Button'
import { navLinks } from '@/data/mockData'

export function PublicNav() {
  return (
    <header className="sticky top-3 z-50 px-4 sm:top-4 sm:px-6">
      <div className="header-shell mx-auto w-full max-w-6xl">
        <div className="flex h-16 items-center justify-between gap-4 px-4 sm:h-[4.5rem] sm:px-6 lg:px-7">
          <div className="flex min-w-0 items-center gap-6 lg:gap-9">
            <SonartraLogo
              href="/"
              mode="full"
              size="lg"
              tone="light"
              className="h-[30px] w-[136px] sm:h-[34px] sm:w-[150px]"
              priority
            />
            <nav className="header-nav hidden items-center gap-2 text-sm text-textSecondary lg:flex">
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-lg px-3 py-2 transition-colors hover:bg-panel/80 hover:text-textPrimary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
                >
                  {link.label}
                </a>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5">
            <Button href="/login" variant="ghost" className="hidden sm:inline-flex">
              Log in
            </Button>
            <Button href="/signup" className="px-4 sm:px-5">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
