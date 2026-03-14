import { SonartraLogo } from '@/components/branding/SonartraLogo'

export function PublicFooter() {
  return (
    <footer className="border-t border-border/70 bg-bg/80">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <SonartraLogo mode="full" size="sm" href="/" />
          <p className="text-sm text-textSecondary">Performance intelligence for modern organisations.</p>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">© {new Date().getFullYear()} Sonartra</p>
      </div>
    </footer>
  )
}
