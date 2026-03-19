import React from 'react'

import { Card } from '@/components/ui/Card'
import type { AssessmentSummaryMetric } from '@/lib/assessment/assessment-repository-types'

export function AssessmentSummaryStrip({ metrics }: { metrics: AssessmentSummaryMetric[] }) {
  return (
    <section aria-label="Assessment summary strip">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="min-h-[140px] border-border/75 bg-panel/78 px-5 py-5 sm:px-6 sm:py-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/90">{metric.label}</p>
            <p className="mt-3 metric-value">{metric.value}</p>
            <p className="mt-3 text-sm leading-6 text-textSecondary">{metric.detail}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}
