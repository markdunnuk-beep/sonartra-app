import { AlertTriangle, ArrowRight, Building2, CheckCircle2, CircleDot, FileSearch, Rocket, ShieldCheck, Users2 } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { adminDashboardModel, getOrganisationSeatFootprintSummary, getReleasePublishStateSummary } from '@/lib/admin/dashboard'
import { assessmentVersions, assessments, getStatusLabel, organisations } from '@/lib/admin/domain'

const toneClasses = {
  critical: 'border-rose-500/30 bg-rose-500/[0.08] text-rose-100',
  attention: 'border-amber-400/30 bg-amber-400/[0.08] text-amber-100',
  steady: 'border-emerald-500/30 bg-emerald-500/[0.08] text-emerald-100',
} as const

const toneIcons = {
  critical: AlertTriangle,
  attention: CircleDot,
  steady: CheckCircle2,
} as const

function DashboardPanel({
  eyebrow,
  title,
  description,
  action,
  children,
}: {
  eyebrow: string
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Card className="px-6 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-col gap-4 border-b border-border/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{eyebrow}</p>
          <h2 className="mt-2 text-lg font-semibold tracking-tight text-textPrimary">{title}</h2>
          {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">{description}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  )
}

function MetricStrip() {
  return (
    <section className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
      {adminDashboardModel.overviewMetrics.map((metric) => (
        <StatCard
          key={metric.label}
          label={metric.label}
          value={metric.value}
          detail={metric.detail}
          className="min-h-[148px] bg-panel/82"
        />
      ))}
    </section>
  )
}

function ControlQueuePanel() {
  return (
    <DashboardPanel
      eyebrow="Control queue"
      title="Action-required signals across release, tenant, and access operations"
      description="Prioritise work that changes publish readiness, tenant posture, or audit confidence. This queue is derived from the shared admin domain model so the dashboard reads as an operational surface rather than a static KPI layer."
      action={
        <Link
          href="/admin/releases"
          className="interaction-control inline-flex items-center gap-2 rounded-xl border border-accent/35 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:border-accent/50 hover:text-[#9fcbff]"
        >
          Review release readiness
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <div className="grid gap-3 xl:grid-cols-2">
        {adminDashboardModel.controlQueue.map((item) => {
          const ToneIcon = toneIcons[item.tone]

          return (
            <Link
              key={item.id}
              href={item.href}
              className="group rounded-2xl border border-border/75 bg-bg/45 p-4 transition-colors duration-200 hover:border-accent/25 hover:bg-panel/80"
            >
              <div className="flex items-start justify-between gap-4">
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] uppercase tracking-[0.14em] ${toneClasses[item.tone]}`}>
                  <ToneIcon className="h-3.5 w-3.5" />
                  {item.tone}
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.14em] text-textSecondary/70">Open items</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight text-textPrimary">{item.metric}</p>
                </div>
              </div>
              <h3 className="mt-4 text-base font-semibold tracking-tight text-textPrimary">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-textSecondary">{item.detail}</p>
              <div className="mt-4 inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-accent">
                Open control surface
                <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </div>
            </Link>
          )
        })}
      </div>
    </DashboardPanel>
  )
}

function ReleasePipelinePanel() {
  const publishState = getReleasePublishStateSummary(assessmentVersions)
  const releaseNotes = assessmentVersions
    .filter((version) => version.status === 'validated' || version.validationSummary.ruleErrors > 0 || !version.validationSummary.previewReady)
    .map((version) => {
      const assessment = assessments.find((item) => item.id === version.assessmentId)

      return {
        id: version.id,
        title: `${assessment?.title ?? 'Assessment'} v${version.versionNumber}`,
        summary:
          version.status === 'validated'
            ? `${getStatusLabel(version.publishStatus)} for ${version.publishTarget.description.toLowerCase()}`
            : `${version.validationSummary.ruleErrors} rule error${version.validationSummary.ruleErrors === 1 ? '' : 's'} · preview ready ${version.validationSummary.previewReady ? 'yes' : 'no'}`,
      }
    })

  return (
    <DashboardPanel
      eyebrow="Assessment control"
      title="Assessment release pipeline snapshot"
      description="Assessment versions remain controlled product assets. Track where each version sits in validation, release review, live publish state, and historical lineage."
    >
      <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-5">
        {adminDashboardModel.releasePipeline.map((bucket) => (
          <div key={bucket.status} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{bucket.label}</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-textPrimary">{bucket.count}</p>
            <p className="mt-3 text-sm leading-6 text-textSecondary">{bucket.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-3 xl:grid-cols-3">
        <div className="rounded-2xl border border-border/75 bg-bg/45 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Publish state</p>
          <div className="mt-3 grid gap-2 text-sm text-textSecondary">
            <div className="flex items-center justify-between gap-3"><span>Scheduled</span><span className="font-medium text-textPrimary">{publishState.scheduled}</span></div>
            <div className="flex items-center justify-between gap-3"><span>Published</span><span className="font-medium text-textPrimary">{publishState.published}</span></div>
            <div className="flex items-center justify-between gap-3"><span>Paused</span><span className="font-medium text-textPrimary">{publishState.paused}</span></div>
            <div className="flex items-center justify-between gap-3"><span>Rolled back</span><span className="font-medium text-textPrimary">{publishState.rolled_back}</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-border/75 bg-bg/45 p-4 xl:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Release readiness notes</p>
          <div className="mt-3 grid gap-3 text-sm leading-6 text-textSecondary md:grid-cols-2">
            {releaseNotes.map((note) => (
              <div key={note.id} className="rounded-xl border border-border/70 bg-panel/60 p-3.5">
                <p className="font-medium text-textPrimary">{note.title}</p>
                <p className="mt-2">{note.summary}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardPanel>
  )
}

function TenantHealthPanel() {
  const seatFootprint = getOrganisationSeatFootprintSummary(organisations)

  return (
    <DashboardPanel
      eyebrow="Tenant activity"
      title="Customer and tenant health snapshot"
      description="Monitor tenant enablement, seat uptake, operating status, and recent activity from a platform-operations perspective rather than a CRM pipeline view."
      action={
        <div className="rounded-2xl border border-border/75 bg-bg/45 px-4 py-3 text-right">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Estate footprint</p>
          <p className="mt-1 text-lg font-semibold tracking-tight text-textPrimary">{seatFootprint.assigned}/{seatFootprint.purchased}</p>
          <p className="mt-1 text-xs text-textSecondary">{seatFootprint.invited} invited seats pending activation</p>
        </div>
      }
    >
      <div className="space-y-3">
        {adminDashboardModel.tenantHealth.map((tenant) => (
          <div key={tenant.organisationId} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <h3 className="text-base font-semibold tracking-tight text-textPrimary">{tenant.organisationName}</h3>
                  <span className="rounded-full border border-border/80 bg-panel/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-textSecondary">
                    {tenant.plan}
                  </span>
                  <span className="rounded-full border border-border/80 bg-panel/75 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-textSecondary">
                    {tenant.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-textSecondary">
                  {tenant.enabledProducts.join(' · ')} · {tenant.enabledAssessmentCount} enabled assessment version line{tenant.enabledAssessmentCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="grid gap-3 text-right text-sm text-textSecondary sm:grid-cols-3 xl:min-w-[360px]">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em]">Seat usage</p>
                  <p className="mt-1 font-medium text-textPrimary">{tenant.seatUsage}</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em]">Utilisation</p>
                  <p className="mt-1 font-medium text-textPrimary">{tenant.seatUtilisationPercent}%</p>
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em]">Recent activity</p>
                  <p className="mt-1 font-medium text-textPrimary">{tenant.recentActivityLabel}</p>
                </div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              {tenant.statusFlags.map((flag) => (
                <span key={flag} className="rounded-full border border-border/75 bg-panel/65 px-3 py-1.5 text-[11px] uppercase tracking-[0.14em] text-textSecondary">
                  {flag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardPanel>
  )
}

function RecentActivityPanel() {
  return (
    <DashboardPanel
      eyebrow="Operational changes"
      title="Recent admin and release activity"
      description="Follow privileged changes, release actions, and tenant-facing updates through the typed audit event model."
    >
      <div className="space-y-3">
        {adminDashboardModel.recentActivity.map((event) => (
          <div key={event.id} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <p className="text-base font-semibold tracking-tight text-textPrimary">{event.summary}</p>
                <p className="mt-2 text-sm leading-6 text-textSecondary">
                  {event.actor.displayName} · {getStatusLabel(event.action)} · {event.entity.label}
                </p>
              </div>
              <div className="text-right text-sm text-textSecondary">
                <p className="text-[11px] uppercase tracking-[0.14em]">Entity</p>
                <p className="mt-1 font-medium text-textPrimary">{getStatusLabel(event.entity.entityType)}</p>
                <p className="mt-2">{event.occurredAt}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardPanel>
  )
}

function AuditVisibilityPanel() {
  const items = [
    {
      label: 'Recent publish events',
      value: adminDashboardModel.auditVisibility.publishEventsLast7Days,
      icon: Rocket,
    },
    {
      label: 'Release actions · 7d',
      value: adminDashboardModel.auditVisibility.releaseActionsLast7Days,
      icon: ShieldCheck,
    },
    {
      label: 'Access actions · 7d',
      value: adminDashboardModel.auditVisibility.accessActionsLast7Days,
      icon: Users2,
    },
  ]

  return (
    <DashboardPanel
      eyebrow="Audit evidence"
      title="Compact audit and control visibility"
      description="Keep governance evidence visible without overwhelming the main operator flow."
      action={
        <Link href="/admin/audit" className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-[#9fcbff]">
          Open audit evidence
          <ArrowRight className="h-4 w-4" />
        </Link>
      }
    >
      <div className="grid gap-3 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
          {items.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                <Icon className="h-4 w-4" />
              </div>
              <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-textSecondary">{label}</p>
              <p className="mt-2 text-2xl font-semibold tracking-tight text-textPrimary">{value}</p>
            </div>
          ))}
        </div>
        <div className="rounded-2xl border border-border/75 bg-bg/45 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Audit count by entity type</p>
          <div className="mt-4 space-y-3">
            {adminDashboardModel.auditVisibility.entityCounts.map((entity) => (
              <div key={entity.entityType} className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-panel/55 px-3.5 py-3 text-sm text-textSecondary">
                <span className="inline-flex items-center gap-2"><Building2 className="h-3.5 w-3.5 text-accent" />{entity.label}</span>
                <span className="font-medium text-textPrimary">{entity.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardPanel>
  )
}

export function AdminDashboardSurface() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Administrator platform"
        title="Operational control for Sonartra platform state"
        description="A high-signal command layer for tenant oversight, assessment release readiness, access posture, and audit evidence across Sonartra operations."
        showDashboardButton={false}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <div className="rounded-2xl border border-border/75 bg-bg/45 px-4 py-3 text-right">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Audit reference window</p>
              <p className="mt-1 text-sm font-medium text-textPrimary">{adminDashboardModel.generatedAt}</p>
            </div>
            <Link
              href="/admin/audit"
              className="interaction-control inline-flex items-center gap-2 rounded-xl border border-accent/35 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:border-accent/50 hover:text-[#9fcbff]"
            >
              Review audit evidence
              <FileSearch className="h-4 w-4" />
            </Link>
          </div>
        }
      />

      <MetricStrip />
      <ControlQueuePanel />
      <ReleasePipelinePanel />
      <TenantHealthPanel />
      <RecentActivityPanel />
      <AuditVisibilityPanel />
    </div>
  )
}
