import { Card } from '@/components/ui/Card'

export function ProfileSummaryCard({ summary, strengths, watchouts, environment }: { summary: string; strengths: string[]; watchouts: string[]; environment: string[] }) {
  return (
    <Card className="space-y-4">
      <h3 className="text-lg font-semibold text-textPrimary">Profile Summary</h3>
      <p className="text-sm text-textSecondary">{summary}</p>
      <div className="grid gap-4 md:grid-cols-3">
        <List title="Key Strengths" items={strengths} />
        <List title="Watchouts" items={watchouts} />
        <List title="Ideal Environment" items={environment} />
      </div>
    </Card>
  )
}

function List({ title, items }: { title: string; items: string[] }) {
  return <div><p className="mb-2 text-sm font-medium text-textPrimary">{title}</p><ul className="space-y-1 text-sm text-textSecondary">{items.map((item) => <li key={item}>• {item}</li>)}</ul></div>
}
