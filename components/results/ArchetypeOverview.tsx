import React from 'react'

import { Card } from '@/components/ui/Card'
import type { ArchetypeSummary } from '@/lib/interpretation/archetypes'

import { ArchetypeMap } from '@/components/results/ArchetypeMap'

const CONFIDENCE_LABELS: Record<ArchetypeSummary['confidence'], string> = {
  high: 'High confidence',
  medium: 'Moderate confidence',
  balanced: 'Balanced profile',
}

function SummaryList({ title, items }: { title: string; items: string[] }) {
  if (!items.length) return null

  return (
    <section className="space-y-2 rounded-[1.45rem] border border-white/[0.05] bg-white/[0.016] px-4 py-3.5 sm:px-5 sm:py-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-textSecondary">{title}</h3>
      <ul className="space-y-2 text-sm leading-5 text-textPrimary/88">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/75" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

function IdentitySnapshot({ summary }: { summary: ArchetypeSummary }) {
  return (
    <div className="rounded-[1.5rem] border border-white/[0.035] bg-white/[0.012] px-4 py-3.5 sm:px-[1.125rem] sm:py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-textSecondary">Key markers</p>
      <dl className="mt-2.5 space-y-2.5">
        <div className="flex items-start justify-between gap-4 border-b border-white/[0.045] pb-2.5">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Primary</dt>
          <dd className="max-w-[16ch] text-right text-sm font-semibold text-textPrimary">{summary.primaryLabel}</dd>
        </div>
        {summary.secondaryKey && summary.secondaryLabel ? (
          <div className="flex items-start justify-between gap-4 border-b border-white/[0.045] pb-2.5">
            <dt className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Secondary</dt>
            <dd className="max-w-[16ch] text-right text-sm font-semibold text-textPrimary">{summary.secondaryLabel}</dd>
          </div>
        ) : null}
        <div className="flex items-start justify-between gap-4">
          <dt className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Tilt</dt>
          <dd className="max-w-[20ch] text-right text-sm font-semibold leading-5 text-textPrimary/92">{summary.behaviouralTilt}</dd>
        </div>
      </dl>
    </div>
  )
}

export function ArchetypeOverview({ summary }: { summary?: ArchetypeSummary }) {
  if (!summary) {
    return null
  }

  return (
    <Card className="space-y-8 border-emerald-400/[0.1] bg-panel/90 sm:space-y-10 lg:space-y-12">
      <div className="space-y-7 sm:space-y-8">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(240px,0.62fr)] xl:items-start xl:gap-8">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2.5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/68">Archetype Overview</p>
              <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-textSecondary">
                {CONFIDENCE_LABELS[summary.confidence]}
              </span>
            </div>
            <div className="space-y-3">
              <h2 className="max-w-[20ch] text-2xl font-semibold tracking-tight text-textPrimary sm:text-[2rem] lg:text-[2.2rem]">
                Primary Archetype: {summary.primaryLabel}
              </h2>
              {summary.secondaryKey && summary.secondaryLabel ? (
                <p className="text-sm font-medium text-textPrimary/78 sm:text-[15px]">Secondary Influence: {summary.secondaryLabel}</p>
              ) : null}
              <p className="text-sm uppercase tracking-[0.16em] text-textSecondary">Behavioural Tilt: {summary.behaviouralTilt}</p>
            </div>
            <p className="max-w-[56ch] text-sm leading-6 text-textSecondary sm:max-w-[58ch] sm:text-[15px] sm:leading-[1.75]">
              {summary.summary}
            </p>
          </div>

          <div className="xl:pt-1">
            <IdentitySnapshot summary={summary} />
          </div>
        </div>

        <ArchetypeMap summary={summary} />
      </div>

      <div className="mt-1 grid gap-4 lg:mt-2 lg:grid-cols-3 lg:gap-4">
        <SummaryList title="Strengths" items={summary.strengths} />
        <SummaryList title="Watchouts" items={summary.watchouts} />
        <SummaryList title="Focus Areas" items={summary.focusAreas} />
      </div>
    </Card>
  )
}
