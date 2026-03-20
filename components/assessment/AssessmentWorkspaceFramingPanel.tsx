import React from 'react'
import { Card } from '@/components/ui/Card'
import type { AssessmentWorkspaceFramingModel } from '@/lib/assessment/assessment-workspace-framing'

interface AssessmentWorkspaceFramingPanelProps {
  framing: AssessmentWorkspaceFramingModel
}

function DetailBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1 rounded-xl border border-border/70 bg-bg/25 px-3.5 py-3 sm:px-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-textSecondary/75">{label}</p>
      <p className="text-sm text-textPrimary">{value}</p>
    </div>
  )
}

export function AssessmentWorkspaceFramingPanel({ framing }: AssessmentWorkspaceFramingPanelProps) {
  return (
    <Card className="border-border/80 bg-panel/88 p-0">
      <div className="grid gap-4 border-b border-border/70 px-5 py-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1fr)_220px] lg:gap-5">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-accent-2">
              {framing.classification}
            </span>
            {framing.recommendationCue ? (
              <span className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-200/90">
                {framing.recommendationCue.eyebrow}
              </span>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-textPrimary sm:text-[1.8rem]">{framing.title}</h2>
            <p className="max-w-3xl text-sm leading-6 text-textSecondary/92 sm:text-[0.97rem]">{framing.subtitle}</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-textSecondary/80">Why it matters</p>
            <p className="max-w-3xl text-sm leading-6 text-textPrimary/90 sm:text-[0.97rem]">{framing.whyItMatters}</p>
          </div>
        </div>

        <div className="grid gap-2.5 self-start">
          <DetailBlock label="Current state" value={framing.currentActionLabel} />
          <DetailBlock label="Expected time" value={framing.estimatedMinutesLabel} />
          <DetailBlock label="Question set" value={framing.questionCountLabel} />
        </div>
      </div>

      <div className="grid gap-4 px-5 py-4 sm:px-6 sm:py-5 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,18rem)] lg:gap-5">
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-textSecondary/80">Output expectation</p>
            <p className="text-sm leading-6 text-textSecondary">{framing.outputExpectation}</p>
          </div>

          <div className="space-y-1.5">
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-textSecondary/80">What to do now</p>
            <p className="text-sm leading-6 text-textSecondary">{framing.currentActionDetail}</p>
          </div>

          {framing.recommendationCue ? (
            <div className="rounded-xl border border-emerald-400/15 bg-emerald-500/6 px-4 py-3">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-emerald-200/90">{framing.recommendationCue.eyebrow}</p>
              <p className="mt-1 text-sm leading-6 text-emerald-50/85">{framing.recommendationCue.detail}</p>
            </div>
          ) : null}
        </div>

        <div className="space-y-3 rounded-2xl border border-border/70 bg-bg/20 p-4">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-textSecondary/80">Measurement focus</p>
          <ul className="space-y-1.5 text-sm text-textSecondary">
            {framing.measurementFocus.map((item) => (
              <li key={item} className="flex gap-2.5 leading-6">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" aria-hidden="true" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  )
}
