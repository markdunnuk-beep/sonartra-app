import React from 'react'
import { SonartraLogo } from '@/components/branding/SonartraLogo'
import { Bell, Search } from 'lucide-react'

export function TopHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-col gap-6 border-b border-border/80 pb-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2.5">
            <SonartraLogo mode="mark" size="sm" tone="light" />
            <p className="eyebrow">Executive Console</p>
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-textSecondary">{subtitle}</p>
        </div>

        <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
          <div className="flex min-h-10 flex-1 items-center gap-2 rounded-xl border border-border/80 bg-panel/70 px-3 text-sm text-textSecondary sm:min-w-[280px] sm:flex-none">
            <Search size={15} />
            Search intel, teams, signals
          </div>
          <button className="rounded-xl border border-border/80 bg-panel/70 p-2.5 text-textSecondary transition-colors hover:text-textPrimary">
            <Bell size={16} />
          </button>
          <div className="h-9 w-9 rounded-full border border-border/80 bg-accent/25" />
        </div>
      </div>
    </div>
  )
}
