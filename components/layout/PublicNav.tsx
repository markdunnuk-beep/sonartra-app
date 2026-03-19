import { SonartraLogo } from '@/components/branding/SonartraLogo'
import { Button } from '@/components/ui/Button'
import { navLinks } from '@/data/mockData'

export function PublicNav() {
  return (
    <header className="sticky top-3 z-50 px-4 sm:top-4 sm:px-6">
      <div className="header-shell mx-auto w-full max-w-6xl">
        <div className="flex h-16 items-center gap-4 px-4 sm:h-[4.5rem] sm:px-6 lg:grid lg:grid-cols-[auto_1fr_auto] lg:items-center lg:gap-6 lg:px-7">
          <div className="flex items-center lg:pr-2">
            <SonartraLogo
              href="/"
              mode="full"
              size="lg"
              tone="light"
              className="h-[34px] w-[152px] sm:h-[38px] sm:w-[170px]"
              priority
            />
          </div>

          <nav className="header-nav hidden w-fit items-center gap-2 justify-self-center text-sm text-textSecondary lg:flex">
            {navLinks.map((link) => (
              <a key={link.href} href={link.href} className="nav-link">
                {link.label}
              </a>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2 sm:gap-2.5 lg:gap-2.5">
            <Button href="/sign-in" variant="ghost" className="hidden sm:inline-flex">
              Log in
            </Button>
            <Button href="/sign-up" className="border-white/[0.08] bg-panel/70 px-4 text-[#E7EEF9] shadow-none hover:border-accent/35 hover:bg-panel/85 sm:px-5">
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </header>
  )
}
