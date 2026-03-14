import { Card } from './Card'

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="panel-hover h-full">
      <p className="muted-label">{label}</p>
      <p className="mt-4 text-2xl font-semibold tracking-tight text-textPrimary">{value}</p>
      {detail && <p className="mt-2 text-sm text-textSecondary">{detail}</p>}
    </Card>
  )
}
