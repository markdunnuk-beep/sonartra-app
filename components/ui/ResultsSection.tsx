import { ReactNode } from 'react'
import { Card } from './Card'

export function ResultsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-4">
      <h3 className="border-b border-border/70 pb-3 text-lg font-semibold tracking-tight text-textPrimary">{title}</h3>
      {children}
    </Card>
  )
}
