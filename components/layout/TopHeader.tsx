import { Bell, Search } from 'lucide-react'

export function TopHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-border/80 pb-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-textPrimary md:text-3xl">{title}</h1>
        <p className="mt-1 text-sm text-textSecondary md:text-base">{subtitle}</p>
      </div>
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-border bg-panel px-3 py-2 text-sm text-textSecondary md:flex">
          <Search size={15} />
          Search or run command
        </div>
        <button className="rounded-lg border border-border bg-panel p-2 text-textSecondary transition-colors hover:text-textPrimary">
          <Bell size={16} />
        </button>
        <div className="h-9 w-9 rounded-full bg-accent/30 ring-1 ring-accent/50" />
      </div>
    </div>
  )
}
