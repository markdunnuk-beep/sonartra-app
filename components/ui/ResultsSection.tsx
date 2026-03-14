import { ReactNode } from 'react'
import { Card } from './Card'

export function ResultsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="space-y-3">
      <h3 className="text-lg font-semibold text-textPrimary">{title}</h3>
      {children}
    </Card>
  )
}
