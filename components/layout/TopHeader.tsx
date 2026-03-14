import { Bell, Search } from 'lucide-react'

export function TopHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border/80 pb-5 lg:pb-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-textPrimary lg:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-textSecondary">{subtitle}</p>
      </div>
      <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-3">
        <div className="hidden items-center gap-2 rounded-xl border border-border/80 bg-panel px-3 py-2 text-sm text-textSecondary lg:flex">
          <Search size={15} />
          Search or run command
        </div>
        <button className="rounded-xl border border-border/80 bg-panel p-2 text-textSecondary transition-colors hover:text-textPrimary">
          <Bell size={16} />
        </button>
        <div className="h-8 w-8 rounded-full border border-border/70 bg-accent/30" />
      </div>
    </div>
  )
}
