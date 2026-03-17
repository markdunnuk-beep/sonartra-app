import React from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { mapLifecyclePresentation } from '@/lib/lifecycle-presentation'
import { DashboardState } from '@/lib/server/dashboard-state'

function formatPercent(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`
}

export function DashboardPageView({ state }: { state: DashboardState }) {
  if (!state.hasCompletedResult || !state.result) {
    const presentation = mapLifecyclePresentation(state.assessment.status)

    return (
      <AppShell>
        <div className="space-y-7 lg:space-y-9">
          <TopHeader title="Dashboard" subtitle="High-level intelligence overview" />

          <section className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Assessment status</p>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard label="Status" value={presentation.dashboardStatusLabel} detail="Individual Intelligence unlocks after completion." />
              <StatCard label="Completion" value={formatPercent(state.assessment.progressPercent)} detail="Assessment progress" />
              <StatCard label="Questions completed" value={String(state.assessment.questionsCompleted)} detail="Responses recorded" />
              <StatCard
                label="Questions remaining"
                value={state.assessment.questionsRemaining === null ? '—' : String(state.assessment.questionsRemaining)}
                detail="Estimated from current progress"
              />
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2 space-y-6">
              <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
                <div>
                  <h3 className="text-lg font-semibold">Assessment in progress</h3>
                  <p className="mt-1 text-sm text-textSecondary">Track completion status and continue to unlock Individual Intelligence.</p>
                </div>
                <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">Live status</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-textSecondary">
                  <span>Completion</span>
                  <span className="font-semibold text-textPrimary">{formatPercent(state.assessment.progressPercent)}</span>
                </div>
                <ProgressBar value={state.assessment.progressPercent} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button href="/assessment">{presentation.dashboardActionLabel}</Button>
                <p className="text-sm text-textSecondary">Continue assessment to unlock behavioural, leadership, and operating insights.</p>
              </div>
            </Card>

            <Card className="space-y-3">
              <h3 className="text-lg font-semibold tracking-tight text-textPrimary">Individual Intelligence availability</h3>
              <p className="text-sm leading-6 text-textSecondary">
                Individual Intelligence availability follows assessment completion and persisted result readiness.
              </p>
              <div className="rounded-lg border border-border/70 bg-bg/45 p-3.5 text-sm text-textSecondary">
                Result cards, layer scores, profile summary, and leadership architecture will appear after a completed persisted result is available.
              </div>
            </Card>
          </section>
        </div>
      </AppShell>
    )
  }

  const result = state.result
  const primarySignals = result.signalSummaries.filter((signal) => signal.isPrimary).slice(0, 3)
  const secondarySignals = result.signalSummaries.filter((signal) => signal.isSecondary).slice(0, 3)

  return (
    <AppShell>
      <div className="space-y-7 lg:space-y-9">
        <TopHeader title="Dashboard" subtitle="High-level intelligence overview" />

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Executive summary</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Assessment Status" value="Completed" detail="Persisted result available" />
            <StatCard label="Result status" value={result.resultStatus} detail="Latest completed cycle" />
            <StatCard label="Signal layers" value={String(result.layerSummaries.length)} detail="Scored intelligence layers" />
            <StatCard label="Top signals" value={String(primarySignals.length)} detail="Primary profile drivers" />
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
              <div>
                <h3 className="text-lg font-semibold">Individual Intelligence Overview</h3>
                <p className="mt-1 text-sm text-textSecondary">Persisted signal profile from the latest completed assessment.</p>
              </div>
              <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">Latest cycle</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {result.layerSummaries.map((layer) => (
                <div key={layer.layerKey} className="rounded-lg border border-border/80 bg-bg/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">{layer.layerKey.replaceAll('_', ' ')}</p>
                  <p className="mt-2 text-2xl font-semibold text-textPrimary">{layer.totalRawValue}</p>
                  <p className="mt-1 text-xs text-textSecondary">Top signal: {layer.topSignalKey?.replaceAll('_', ' ') ?? 'Unavailable'}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="space-y-5">
            <div className="border-b border-border/70 pb-3">
              <h3 className="text-lg font-semibold tracking-tight text-textPrimary">Profile summary</h3>
              <p className="mt-2 text-sm leading-6 text-textSecondary">Summary derived from persisted primary and secondary signal composition.</p>
            </div>
            <div className="grid gap-4">
              <div className="rounded-lg border border-border/70 bg-bg/45 p-3.5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-textPrimary">Primary signals</p>
                <ul className="space-y-1.5 text-sm text-textSecondary">
                  {primarySignals.map((signal) => (
                    <li key={signal.signalKey}>• {signal.signalKey.replaceAll('_', ' ')}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-lg border border-border/70 bg-bg/45 p-3.5">
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-textPrimary">Secondary signals</p>
                <ul className="space-y-1.5 text-sm text-textSecondary">
                  {secondarySignals.map((signal) => (
                    <li key={signal.signalKey}>• {signal.signalKey.replaceAll('_', ' ')}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  )
}
