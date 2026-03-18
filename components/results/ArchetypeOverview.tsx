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
    <section className="space-y-3 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4 sm:p-5">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-textSecondary">{title}</h3>
      <ul className="space-y-2.5 text-sm leading-6 text-textPrimary/90">
        {items.map((item) => (
          <li key={item} className="flex gap-2">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-300/80" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function ArchetypeOverview({ summary }: { summary?: ArchetypeSummary }) {
  if (!summary) {
    return null
  }

  return (
    <Card className="space-y-8 border-emerald-400/[0.12] bg-panel/90 sm:space-y-10">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.9fr)] xl:items-start">
        <div className="space-y-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-100/70">Archetype Overview</p>
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] text-textSecondary">
                {CONFIDENCE_LABELS[summary.confidence]}
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold tracking-tight text-textPrimary sm:text-[2rem]">
                Primary Archetype: {summary.primaryLabel}
              </h2>
              {summary.secondaryKey && summary.secondaryLabel ? (
                <p className="text-sm font-medium text-textPrimary/80">Secondary Influence: {summary.secondaryLabel}</p>
              ) : null}
              <p className="text-sm uppercase tracking-[0.16em] text-textSecondary">Behavioural Tilt: {summary.behaviouralTilt}</p>
            </div>
            <p className="max-w-3xl text-sm leading-7 text-textSecondary sm:text-[15px]">{summary.summary}</p>
          </div>

          <ArchetypeMap summary={summary} />
        </div>

        <div className="rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-white/[0.02] p-5 sm:p-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-textSecondary">Identity Snapshot</p>
              <p className="text-lg font-semibold tracking-tight text-textPrimary">Top-level operating signal</p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="space-y-1 rounded-2xl border border-white/[0.08] bg-bg/30 p-4">
                <dt className="text-[11px] uppercase tracking-[0.18em] text-textSecondary">Primary Archetype</dt>
                <dd className="text-sm font-semibold text-textPrimary">{summary.primaryLabel}</dd>
              </div>
              {summary.secondaryKey && summary.secondaryLabel ? (
                <div className="space-y-1 rounded-2xl border border-white/[0.08] bg-bg/30 p-4">
                  <dt className="text-[11px] uppercase tracking-[0.18em] text-textSecondary">Secondary Influence</dt>
                  <dd className="text-sm font-semibold text-textPrimary">{summary.secondaryLabel}</dd>
                </div>
              ) : null}
              <div className="space-y-1 rounded-2xl border border-white/[0.08] bg-bg/30 p-4">
                <dt className="text-[11px] uppercase tracking-[0.18em] text-textSecondary">Behavioural Tilt</dt>
                <dd className="text-sm font-semibold text-textPrimary">{summary.behaviouralTilt}</dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <SummaryList title="Strengths" items={summary.strengths} />
        <SummaryList title="Watchouts" items={summary.watchouts} />
        <SummaryList title="Focus Areas" items={summary.focusAreas} />
      </div>
    </Card>
  )
}
