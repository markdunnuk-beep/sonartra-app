import { Card } from './Card'

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.03] to-transparent" />
      <p className="relative text-[11px] uppercase tracking-[0.16em] text-textSecondary">{label}</p>
      <p className="relative mt-3 text-2xl font-semibold tracking-tight text-textPrimary">{value}</p>
      {detail && <p className="relative mt-2 text-sm text-textSecondary">{detail}</p>}
    </Card>
  )
}
