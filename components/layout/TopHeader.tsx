import { Bell, Search } from 'lucide-react'

export function TopHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <h1 className="text-2xl font-semibold text-textPrimary">{title}</h1>
        <p className="text-sm text-textSecondary">{subtitle}</p>
      </div>
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm text-textSecondary md:flex"><Search size={15} />Search or run command</div>
        <button className="rounded-lg border border-border p-2 text-textSecondary hover:text-textPrimary"><Bell size={16} /></button>
        <div className="h-8 w-8 rounded-full bg-accent/30" />
      </div>
    </div>
  )
}
