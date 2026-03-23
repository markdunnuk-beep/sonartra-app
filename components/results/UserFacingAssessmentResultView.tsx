import React from 'react'

import { Card } from '@/components/ui/Card'
import { ResultsWorkspaceShell } from '@/components/results/ResultsPrimitives'
import { buildUserFacingAssessmentResultViewModel } from '@/lib/results/live-assessment-user-result-presentation'
import type { LiveAssessmentUserResultContract } from '@/lib/server/live-assessment-user-result'
import Link from 'next/link'

function NoticeCard({ title, message, tone }: { title: string; message: string; tone: 'info' | 'warning' | 'error' }) {
  const toneClass =
    tone === 'error'
      ? 'border-rose-400/30 bg-rose-500/10 text-rose-50'
      : tone === 'warning'
        ? 'border-amber-300/25 bg-amber-500/10 text-amber-50'
        : 'border-sky-300/20 bg-sky-500/8 text-sky-50'

  return (
    <Card className={`space-y-2 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em]">{title}</p>
      <p className="text-sm leading-6 opacity-90">{message}</p>
    </Card>
  )
}

function SummaryCard({
  title,
  label,
  value,
  band,
  descriptor,
  explanation,
  tone,
}: {
  title: string
  label: string
  value: string
  band: string | null
  descriptor: string | null
  explanation: string | null
  tone: 'default' | 'warning' | 'limited'
}) {
  const toneClass =
    tone === 'limited'
      ? 'border-amber-300/20 bg-amber-500/10'
      : tone === 'warning'
        ? 'border-sky-300/20 bg-sky-500/8'
        : 'border-border/80 bg-panel/75'

  return (
    <Card className={`space-y-4 ${toneClass}`}>
      <div className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary">{label}</p>
        <h3 className="text-lg font-semibold tracking-tight text-textPrimary">{title}</h3>
      </div>
      <p className="text-3xl font-semibold tracking-tight text-textPrimary">{value}</p>
      <div className="space-y-1 text-sm text-textSecondary">
        {band ? <p>Band: {band}</p> : null}
        {descriptor ? <p>Descriptor: {descriptor}</p> : null}
        {explanation ? <p>{explanation}</p> : null}
      </div>
    </Card>
  )
}

export function UserFacingAssessmentResultView({ result }: { result: LiveAssessmentUserResultContract }) {
  const viewModel = buildUserFacingAssessmentResultViewModel(result)

  return (
    <ResultsWorkspaceShell
      title={viewModel.title}
      subtitle={viewModel.summary}
      statusLabel={viewModel.statusLabel}
    >
      <Card className="space-y-3 border-border/80 bg-panel/70">
        <div className="flex flex-wrap gap-3 text-sm text-textSecondary">
          {viewModel.versionLabel ? <span>{viewModel.versionLabel}</span> : null}
          {viewModel.completedLabel ? <span>Completed {viewModel.completedLabel}</span> : null}
        </div>
      </Card>

      <Card className="space-y-4 border-border/80 bg-panel/75">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-textSecondary">Report delivery</p>
          <h2 className="text-xl font-semibold tracking-tight text-textPrimary">{viewModel.report.label}</h2>
          <p className="text-sm leading-6 text-textSecondary">{viewModel.report.message}</p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-textSecondary">
          <span>Summary results: {result.resultsAvailable ? 'Ready' : 'Unavailable'}</span>
          <span>Report: {viewModel.report.state.replace(/_/g, ' ')}</span>
          {viewModel.report.generatedLabel ? <span>Generated {viewModel.report.generatedLabel}</span> : null}
        </div>
        <div className="flex flex-wrap gap-3">
          {viewModel.report.viewHref ? (
            <Link
              className="inline-flex items-center rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-textPrimary transition hover:bg-white/10"
              href={viewModel.report.viewHref}
              target="_blank"
            >
              {viewModel.report.state === 'available' ? 'Open report' : 'Generate report'}
            </Link>
          ) : null}
          {viewModel.report.downloadHref ? (
            <Link
              className="inline-flex items-center rounded-full border border-border bg-panel px-4 py-2 text-sm font-medium text-textPrimary transition hover:bg-white/10"
              href={viewModel.report.downloadHref}
            >
              {viewModel.report.state === 'available' ? 'Download report' : 'Generate download'}
            </Link>
          ) : null}
        </div>
      </Card>

      {viewModel.notices.length ? (
        <section className="grid gap-4 lg:grid-cols-2">
          {viewModel.notices.map((notice) => (
            <NoticeCard key={notice.id} title={notice.title} message={notice.message} tone={notice.tone} />
          ))}
        </section>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {viewModel.cards.map((card) => (
          <SummaryCard key={card.id} {...card} />
        ))}
      </section>
    </ResultsWorkspaceShell>
  )
}
