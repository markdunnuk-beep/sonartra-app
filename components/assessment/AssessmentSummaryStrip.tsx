import React from 'react'

import { Card } from '@/components/ui/Card'
import type { AssessmentSummaryMetric } from '@/lib/assessment/assessment-repository-types'

export function AssessmentSummaryStrip({ metrics }: { metrics: AssessmentSummaryMetric[] }) {
  return (
    <section aria-label="Assessment summary strip">
      <div className="grid gap-3.5 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="min-h-[116px] border-border/50 bg-panel/72 px-5 py-4 sm:px-5 sm:py-[1.125rem]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/82">{metric.label}</p>
            <p className="metric-value mt-2.5 text-textPrimary/88">{metric.value}</p>
            <p className="mt-2.5 text-sm leading-6 text-textSecondary/88">{metric.detail}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
