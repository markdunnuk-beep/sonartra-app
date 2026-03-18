import React from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { Card } from '@/components/ui/Card'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { StatCard } from '@/components/ui/StatCard'
import { Button } from '@/components/ui/Button'
import { buildDashboardCoverage, buildDashboardKeySignalTiles, buildDashboardNextActions, type DashboardActionItem } from '@/lib/dashboard/dashboard-surface'
import { mapLifecyclePresentation } from '@/lib/lifecycle-presentation'
import { DashboardState } from '@/lib/server/dashboard-state'

function formatPercent(value: number): string {
  return `${Math.max(0, Math.min(100, Math.round(value)))}%`
}

function statusToneClass(status: DashboardActionItem['status']) {
  switch (status) {
    case 'available':
      return 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
    case 'in_progress':
      return 'border-accent/20 bg-accent/10 text-accent-foreground'
    case 'coming_soon':
      return 'border-border/80 bg-panel/80 text-textSecondary'
    case 'locked':
    default:
      return 'border-border/80 bg-bg/80 text-textSecondary'
  }
}

function ActionStatusPill({ status }: { status: DashboardActionItem['status'] }) {
  const label = status === 'coming_soon' ? 'Coming soon' : status === 'in_progress' ? 'In progress' : status === 'available' ? 'Available' : 'Locked'
  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusToneClass(status)}`}>{label}</span>
}

function DashboardSectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{eyebrow}</p>
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-textPrimary">{title}</h2>
        <p className="mt-1 text-sm text-textSecondary">{description}</p>
      </div>
    </div>
  )
}

function DashboardStatusCard({ state }: { state: DashboardState }) {
  const presentation = mapLifecyclePresentation(state.assessment.status)

  return (
    <Card className="space-y-6">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h3 className="text-lg font-semibold">{presentation.dashboardDetailTitle}</h3>
          <p className="mt-1 text-sm text-textSecondary">{presentation.dashboardDetailBody}</p>
        </div>
        <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">{presentation.dashboardDetailMetaLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Status" value={presentation.dashboardStatusLabel} detail="Lifecycle state from the latest assessment cycle." />
        <StatCard label="Completion" value={formatPercent(state.assessment.progressPercent)} detail="Assessment progress" />
        <StatCard label="Questions completed" value={String(state.assessment.questionsCompleted)} detail="Responses recorded" />
        <StatCard
          label="Questions remaining"
          value={state.assessment.questionsRemaining === null ? '—' : String(state.assessment.questionsRemaining)}
          detail="Estimated from current progress"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-textSecondary">
          <span>Completion</span>
          <span className="font-semibold text-textPrimary">{formatPercent(state.assessment.progressPercent)}</span>
        </div>
        <ProgressBar value={state.assessment.progressPercent} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {presentation.dashboardActionLabel && presentation.dashboardActionHref ? <Button href={presentation.dashboardActionHref}>{presentation.dashboardActionLabel}</Button> : null}
        <p className="text-sm text-textSecondary">{presentation.dashboardDetailFootnote}</p>
      </div>
    </Card>
  )
}

function DashboardNextActions({ state }: { state: DashboardState }) {
  const presentation = mapLifecyclePresentation(state.assessment.status)
  const actions = buildDashboardNextActions(state.assessment.status, presentation, state.hasCompletedResult)

  return (
    <section className="space-y-3">
      <DashboardSectionHeading
        eyebrow="Action queue"
        title="Next Actions"
        description="Prioritised actions for the current assessment state and available workspace capabilities."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {actions.map((action, index) => (
          <Card key={`${action.title}-${index}`} className="flex h-full flex-col justify-between gap-4">
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-textPrimary">{action.title}</h3>
                  <p className="mt-1 text-sm text-textSecondary">{action.description}</p>
                </div>
                <ActionStatusPill status={action.status} />
              </div>
            </div>
            {action.href ? (
              <Button href={action.href} variant={index === 0 ? 'primary' : 'secondary'} disabled={action.disabled} className="w-fit">
                {action.title}
              </Button>
            ) : (
              <Button variant="secondary" disabled className="w-fit">
                {action.status === 'coming_soon' ? 'Coming soon' : action.status === 'in_progress' ? 'Processing' : 'Unavailable'}
              </Button>
            )}
          </Card>
        ))}
      </div>
    </section>
  )
}

function DashboardKeySignalsSnapshot({ state }: { state: DashboardState }) {
  const tiles = state.result ? buildDashboardKeySignalTiles(state.result) : []

  return (
    <section className="space-y-3">
      <DashboardSectionHeading
        eyebrow="Signal snapshot"
        title="Key Signals Snapshot"
        description="Compact headline signals from the latest persisted individual result."
      />
      {tiles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile) => (
            <Card key={tile.category} className="min-h-[172px]">
              <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">{tile.category}</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight text-textPrimary">{tile.signal}</p>
              <p className="mt-3 border-t border-border/70 pt-3 text-sm leading-6 text-textSecondary">{tile.summary}</p>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <p className="text-sm text-textSecondary">Key signals will populate once a persisted individual result is available.</p>
        </Card>
      )}
    </section>
  )
}

function DashboardPlatformProgress({ state }: { state: DashboardState }) {
  const coverageItems = buildDashboardCoverage(state.hasCompletedResult, state.assessment.status)

  return (
    <section className="space-y-3">
      <DashboardSectionHeading
        eyebrow="Workspace coverage"
        title="Intelligence Coverage"
        description="Current availability across Sonartra’s individual, team, and organisation intelligence layers."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {coverageItems.map((item) => (
          <Card key={item.title} className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-textPrimary">{item.title}</h3>
              <span
                className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${
                  item.tone === 'ready'
                    ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100'
                    : item.tone === 'progress'
                      ? 'border-accent/20 bg-accent/10 text-accent-foreground'
                      : 'border-border/80 bg-bg/80 text-textSecondary'
                }`}
              >
                {item.stateLabel}
              </span>
            </div>
            <p className="text-sm text-textSecondary">{item.detail}</p>
          </Card>
        ))}
      </div>
    </section>
  )
}

function DashboardPageContent({ state }: { state: DashboardState }) {
  return (
    <div className="space-y-7 lg:space-y-9">
      <TopHeader title="Dashboard" subtitle="Status, next actions, and intelligence coverage." />
      <DashboardStatusCard state={state} />
      <DashboardNextActions state={state} />
      <DashboardKeySignalsSnapshot state={state} />
      <DashboardPlatformProgress state={state} />
    </div>
  )
}

export function DashboardPreResultContent({ state }: { state: DashboardState }) {
  return <DashboardPageContent state={state} />
}

export function DashboardPageView({ state }: { state: DashboardState }) {
  return (
    <AppShell>
      <DashboardPageContent state={state} />
    </AppShell>
  )
}
