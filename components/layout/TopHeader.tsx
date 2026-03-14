import { SonartraLogo } from '@/components/branding/SonartraLogo'
import { Bell, Search } from 'lucide-react'

export function TopHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-5 border-b border-border/80 pb-5 lg:gap-6 lg:pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <SonartraLogo mode="mark" size="sm" tone="light" className="h-5" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-textSecondary/80">Executive Console</p>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-textPrimary lg:text-3xl">{title}</h1>
          <p className="mt-1.5 text-sm text-textSecondary">{subtitle}</p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <div className="flex min-h-[38px] flex-1 items-center gap-2 rounded-lg border border-border/80 bg-bg/60 px-3 text-sm text-textSecondary sm:min-w-[280px] sm:flex-none">
            <Search size={15} />
            Search intel, teams, signals
          </div>
          <button className="rounded-lg border border-border/80 bg-panel p-2 text-textSecondary transition-colors hover:text-textPrimary">
            <Bell size={16} />
          </button>
          <div className="h-8 w-8 rounded-full border border-border/70 bg-accent/30" />
        </div>
      </div>
    </div>
  )
}
