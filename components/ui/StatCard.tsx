import React from 'react'
import { Card } from './Card'

export function StatCard({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <Card className="group min-h-[136px]">
      <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">{label}</p>
      <p className="mt-3 text-2xl font-semibold tracking-tight text-textPrimary">{value}</p>
      {detail && <p className="mt-3 border-t border-border/70 pt-3 text-sm leading-6 text-textSecondary">{detail}</p>}
    </Card>
  )
}
