import React from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import type { AssessmentRepositoryRecommendation } from '@/lib/assessment/assessment-repository-types'

export function AssessmentRecommendationCard({ recommendation }: { recommendation: AssessmentRepositoryRecommendation }) {
  return (
    <section aria-label="Assessment recommendation">
      <Card className="border border-white/[0.08] bg-panel/[0.9] px-5 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl space-y-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-accent/78">{recommendation.eyebrow}</p>
            <div className="space-y-2.5">
              <h2 className="text-[1.65rem] font-semibold tracking-tight text-textPrimary">{recommendation.title}</h2>
              <p className="text-sm leading-7 text-textSecondary">{recommendation.rationale}</p>
            </div>
            {recommendation.metadata.length > 0 ? (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-textSecondary/76">
                {recommendation.metadata.map((entry, index) => (
                  <React.Fragment key={`${recommendation.itemId}-${entry}`}>
                    {index > 0 ? <span aria-hidden="true" className="text-textSecondary/28">•</span> : null}
                    <span className={index === recommendation.metadata.length - 1 ? 'text-textSecondary/90' : undefined}>{entry}</span>
                  </React.Fragment>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex w-full flex-col gap-2.5 lg:w-auto lg:min-w-[13rem] lg:items-end">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary/70">Action</p>
            <Button href={recommendation.cta.href} className="w-full justify-center px-5 lg:w-auto">
              {recommendation.cta.label}
            </Button>
          </div>
        </div>
      </Card>
    </section>
  )
}
