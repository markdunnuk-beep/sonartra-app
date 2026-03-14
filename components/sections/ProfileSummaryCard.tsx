import { Card } from '@/components/ui/Card'

export function ProfileSummaryCard({ summary, strengths, watchouts, environment }: { summary: string; strengths: string[]; watchouts: string[]; environment: string[] }) {
  return (
    <Card className="space-y-5">
      <div className="border-b border-border/70 pb-3">
        <h3 className="text-lg font-semibold tracking-tight text-textPrimary">Profile Summary</h3>
        <p className="mt-2 text-sm leading-6 text-textSecondary">{summary}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
        <List title="Key Strengths" items={strengths} />
        <List title="Watchouts" items={watchouts} />
        <List title="Ideal Environment" items={environment} />
      </div>
    </Card>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-lg border border-border/70 bg-bg/45 p-3.5">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-textPrimary">{title}</p>
      <ul className="space-y-1.5 text-sm text-textSecondary">
        {items.map((item) => (
          <li key={item}>• {item}</li>
        ))}
      </ul>
    </div>
  )
}
