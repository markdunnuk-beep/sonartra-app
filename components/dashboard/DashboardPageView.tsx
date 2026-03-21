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
      return 'border-emerald-400/20 bg-emerald-500/8 text-emerald-100/90'
    case 'in_progress':
      return 'border-accent/20 bg-accent/10 text-accent-foreground'
    case 'coming_soon':
      return 'border-border/80 bg-panel/75 text-textSecondary'
    case 'locked':
    default:
      return 'border-border/90 bg-bg/85 text-textPrimary/85'
  }
}

function ActionStatusPill({ status }: { status: DashboardActionItem['status'] }) {
  const label = status === 'coming_soon' ? 'Coming soon' : status === 'in_progress' ? 'In progress' : status === 'available' ? 'Available' : 'Locked'
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${statusToneClass(status)}`}>
      {status === 'locked' ? <span aria-hidden="true" className="text-[11px] leading-none">🔒</span> : null}
      {label}
    </span>
  )
}

function DashboardSectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textSecondary">{eyebrow}</p>
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-textPrimary">{title}</h2>
        <p className="mt-1 text-sm text-textSecondary/95">{description}</p>
      </div>
    </div>
  )
}

function DashboardInfrastructureFallback() {
  return (
    <Card className="space-y-4 px-6 py-5 sm:px-7 sm:py-6">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-textSecondary">Temporary issue</p>
        <h2 className="text-xl font-semibold tracking-tight text-textPrimary">We couldn&apos;t load your dashboard right now.</h2>
        <p className="text-sm text-textSecondary">Please try again shortly.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button href="/dashboard">Reload dashboard</Button>
        <p className="text-sm text-textSecondary">Your session is still active, but dashboard data is temporarily unavailable.</p>
      </div>
    </Card>
  )
}

function DashboardStatusCard({ state }: { state: DashboardState }) {
  const presentation = mapLifecyclePresentation(state.assessment.status)

  return (
    <Card className="space-y-5 px-6 py-5 sm:px-7 sm:py-6">
      <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-textPrimary">{presentation.dashboardDetailTitle}</h3>
          <p className="mt-1 text-sm text-textSecondary">{presentation.dashboardDetailBody}</p>
        </div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-textSecondary">{presentation.dashboardDetailMetaLabel}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Status"
          value={presentation.dashboardStatusLabel}
          detail="Lifecycle state from the latest assessment cycle."
          valueClassName="text-[1.75rem]"
          detailClassName="text-xs leading-5 text-textSecondary/80"
        />
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
        <div className="origin-left scale-y-[0.88]">
          <ProgressBar value={state.assessment.progressPercent} />
        </div>
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
    <section className="space-y-4">
      <DashboardSectionHeading
        eyebrow="Action queue"
        title="Next Actions"
        description="Actions based on your current profile and system state."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {actions.map((action, index) => (
          <Card
            key={`${action.title}-${index}`}
            className={`flex h-full min-h-[188px] flex-col justify-between gap-4 px-6 py-5 sm:px-7 sm:py-6 ${
              action.href && !action.disabled
                ? 'border-border/75 transition-colors duration-200 hover:border-accent/35 hover:bg-panel/90'
                : action.status === 'locked'
                  ? 'opacity-95'
                  : ''
            }`}
          >
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
              <Button href={action.href} variant={index === 0 ? 'primary' : 'ghost'} disabled={action.disabled} className="w-fit">
                {action.title}
              </Button>
            ) : (
              <Button variant="ghost" disabled className="w-fit">
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
    <section className="space-y-4">
      <DashboardSectionHeading
        eyebrow="Signal snapshot"
        title="Key Signals Snapshot"
        description="Headline signals from your latest result."
      />
      {tiles.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {tiles.map((tile) => (
            <Card key={tile.category} className="min-h-[164px] px-6 py-5 sm:px-7 sm:py-6">
              <p className="text-[11px] uppercase tracking-[0.1em] text-textSecondary/85">{tile.category}</p>
              <p className="mt-3.5 text-2xl font-semibold tracking-tight text-textPrimary">{tile.signal}</p>
              <p className="mt-3 border-t border-border/70 pt-3 text-sm leading-5 text-textSecondary">{tile.summary}</p>
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
    <section className="space-y-4">
      <DashboardSectionHeading
        eyebrow="Workspace coverage"
        title="Intelligence Coverage"
        description="Availability across Sonartra intelligence layers."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {coverageItems.map((item) => (
          <Card key={item.title} className={`space-y-4 px-6 py-5 sm:px-7 sm:py-6 ${item.tone !== 'active' ? 'opacity-[0.94]' : ''}`}>
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold text-textPrimary">{item.title}</h3>
              <span
                className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] ${
                  item.tone === 'active'
                    ? 'border-emerald-400/20 bg-emerald-500/8 text-emerald-100/90'
                    : item.tone === 'coming_soon'
                      ? 'border-border/80 bg-panel/75 text-textSecondary'
                      : 'border-border/90 bg-bg/85 text-textPrimary/85'
                }`}
              >
                {item.tone === 'locked' ? <span aria-hidden="true" className="text-[11px] leading-none">🔒</span> : null}
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
    <div className="space-y-8 lg:space-y-10">
      <TopHeader title="Dashboard" subtitle="Status, next actions, and intelligence coverage." />
      {state.status === 'error' ? (
        <DashboardInfrastructureFallback />
      ) : (
        <>
          <DashboardStatusCard state={state} />
          <DashboardNextActions state={state} />
          <DashboardKeySignalsSnapshot state={state} />
          <DashboardPlatformProgress state={state} />
        </>
      )}
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
