import { Card } from './Card'

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card>
      <p className="text-xs uppercase tracking-wide text-textSecondary">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-textPrimary">{value}</p>
      {detail && <p className="mt-2 text-sm text-textSecondary">{detail}</p>}
    </Card>
  )
}
