import { clsx } from 'clsx'
import { ArrowRight, Filter, LayoutTemplate, Search } from 'lucide-react'
import Link from 'next/link'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { AdminTabItem, formatAdminTimestamp, getVersionReleaseSteps } from '@/lib/admin/wireframe'
import { getStatusLabel } from '@/lib/admin/domain'
import { AssessmentVersion } from '@/lib/admin/domain/assessments'
import { AuditLogEvent } from '@/lib/admin/domain/audit'

const statusToneMap = {
  active: 'emerald',
  implementation: 'amber',
  suspended: 'rose',
  maintenance: 'amber',
  retired: 'slate',
  invited: 'amber',
  deactivated: 'slate',
  draft: 'slate',
  in_review: 'amber',
  validated: 'sky',
  live: 'emerald',
  archived: 'slate',
  unpublished: 'slate',
  scheduled: 'sky',
  published: 'emerald',
  paused: 'amber',
  rolled_back: 'rose',
  super_admin: 'sky',
  platform_admin: 'sky',
  assessment_admin: 'violet',
  customer_success_admin: 'emerald',
  support_admin: 'amber',
  internal_admin: 'sky',
  organisation_user: 'slate',
  owner: 'sky',
  admin: 'violet',
  manager: 'emerald',
  member: 'slate',
  analyst: 'amber',
  pass: 'emerald',
  warning: 'amber',
  error: 'rose',
  pending: 'slate',
  current: 'sky',
  complete: 'emerald',
  blocked: 'rose',
} as const

export type Tone = 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet'

const toneClasses: Record<Tone, string> = {
  slate: 'border-white/10 bg-white/[0.03] text-textSecondary',
  sky: 'border-sky-400/25 bg-sky-400/[0.08] text-sky-100',
  emerald: 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100',
  amber: 'border-amber-400/25 bg-amber-400/[0.08] text-amber-100',
  rose: 'border-rose-400/25 bg-rose-400/[0.08] text-rose-100',
  violet: 'border-violet-400/25 bg-violet-400/[0.08] text-violet-100',
}

export function toneForStatus(status: string): Tone {
  return statusToneMap[status as keyof typeof statusToneMap] ?? 'slate'
}

export function Badge({ label, tone = 'slate', className }: { label: string; tone?: Tone; className?: string }) {
  return (
    <span className={clsx('inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em]', toneClasses[tone], className)}>
      {label}
    </span>
  )
}

export function StatusBadge({ status }: { status: string }) {
  return <Badge label={getStatusLabel(status)} tone={toneForStatus(status)} />
}

export function SurfaceSection({ title, eyebrow, description, actions, children }: { title: string; eyebrow?: string; description?: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <Card className="px-6 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-col gap-4 border-b border-white/[0.06] pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <div>
            <h2 className="text-[1.15rem] font-semibold tracking-tight text-textPrimary">{title}</h2>
            {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-textSecondary">{description}</p> : null}
          </div>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  )
}

export function MetricCard({ label, value, detail, trend }: { label: string; value: string; detail: string; trend?: string }) {
  return (
    <Card className="min-h-[158px] border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">{label}</p>
      <p className="mt-3 text-[2.15rem] font-semibold tracking-[-0.04em] text-textPrimary">{value}</p>
      {trend ? <p className="mt-2 text-xs uppercase tracking-[0.14em] text-accent">{trend}</p> : null}
      <p className="mt-4 border-t border-white/[0.06] pt-4 text-sm leading-6 text-textSecondary">{detail}</p>
    </Card>
  )
}

export function MetaGrid({ items, columns = 4 }: { items: Array<{ label: string; value: string; hint?: string }>; columns?: 2 | 3 | 4 }) {
  const gridClass = columns === 2 ? 'md:grid-cols-2' : columns === 3 ? 'md:grid-cols-3' : 'md:grid-cols-2 xl:grid-cols-4'

  return (
    <div className={clsx('grid gap-3', gridClass)}>
      {items.map((item) => (
        <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-3.5">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{item.label}</p>
          <p className="mt-2 text-sm font-medium text-textPrimary">{item.value}</p>
          {item.hint ? <p className="mt-1 text-xs leading-5 text-textSecondary">{item.hint}</p> : null}
        </div>
      ))}
    </div>
  )
}

export function FilterBar({ searchPlaceholder, segments, trailing }: { searchPlaceholder: string; segments: string[]; trailing?: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-white/[0.08] bg-bg/55 p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1 lg:max-w-md">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textSecondary" />
            <Input placeholder={searchPlaceholder} className="pl-10" />
          </div>
          <div className="flex flex-wrap gap-2">
            {segments.map((segment, index) => (
              <span
                key={segment}
                className={clsx(
                  'inline-flex items-center rounded-xl border px-3.5 py-2 text-xs uppercase tracking-[0.14em]',
                  index === 0 ? 'border-accent/30 bg-accent/10 text-accent' : 'border-white/[0.08] bg-panel/60 text-textSecondary',
                )}
              >
                {segment}
              </span>
            ))}
            <span className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] bg-panel/60 px-3.5 py-2 text-xs uppercase tracking-[0.14em] text-textSecondary">
              <Filter className="h-3.5 w-3.5" />
              Filters
            </span>
          </div>
        </div>
        {trailing ? <div className="flex flex-wrap items-center gap-2">{trailing}</div> : null}
      </div>
    </div>
  )
}

export function Tabs({ items }: { items: AdminTabItem[] }) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-2xl border border-white/[0.08] bg-bg/60 p-1.5">
      {items.map((item) => {
        const content = (
          <>
            <span>{item.label}</span>
            {item.count !== undefined ? <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px]">{item.count}</span> : null}
          </>
        )

        const className = clsx(
          'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs uppercase tracking-[0.14em] transition-colors',
          item.current ? 'bg-panel text-textPrimary shadow-[0_12px_24px_-20px_rgba(0,0,0,0.9)]' : 'text-textSecondary hover:bg-panel/70 hover:text-textPrimary',
        )

        return item.href ? (
          <Link key={`${item.label}-${item.href}`} href={item.href} className={className}>
            {content}
          </Link>
        ) : (
          <div key={item.label} className={className}>
            {content}
          </div>
        )
      })}
    </div>
  )
}

export function Table({ columns, rows }: { columns: string[]; rows: ReactNode[][] }) {
  const templateColumns = `repeat(${columns.length}, minmax(0, 1fr))`

  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-white/[0.08] bg-bg/50">
      <div className="hidden gap-3 border-b border-white/[0.06] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-textSecondary lg:grid" style={{ gridTemplateColumns: templateColumns }}>
        {columns.map((column) => (
          <div key={column}>{column}</div>
        ))}
      </div>
      <div className="divide-y divide-white/[0.06]">
        {rows.map((row, index) => (
          <div key={index} className="grid gap-3 px-5 py-4 lg:items-center" style={{ gridTemplateColumns: templateColumns }}>
            {row.map((cell, cellIndex) => (
              <div key={cellIndex} className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.16em] text-textSecondary lg:hidden">{columns[cellIndex]}</div>
                <div className="mt-1 lg:mt-0">{cell}</div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function MetaPanel({ title, items, footer }: { title: string; items: Array<{ label: string; value: ReactNode }>; footer?: ReactNode }) {
  return (
    <Card className="h-full px-5 py-5 sm:px-6 sm:py-6">
      <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">{title}</p>
      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <div key={item.label} className="rounded-2xl border border-white/[0.07] bg-bg/55 px-4 py-3.5">
            <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{item.label}</p>
            <div className="mt-2 text-sm leading-6 text-textPrimary">{item.value}</div>
          </div>
        ))}
      </div>
      {footer ? <div className="mt-4">{footer}</div> : null}
    </Card>
  )
}

export function TimelineItem({ event }: { event: AuditLogEvent }) {
  return (
    <div className="relative pl-7">
      <div className="absolute left-2 top-2 h-full w-px bg-white/[0.08]" />
      <div className="absolute left-0 top-1.5 h-4 w-4 rounded-full border border-accent/30 bg-accent/15 shadow-[0_0_0_4px_rgba(76,159,255,0.08)]" />
      <div className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-3.5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-textPrimary">{event.summary}</p>
            <p className="mt-2 text-sm leading-6 text-textSecondary">{event.actor.displayName} · {event.entity.label} · {getStatusLabel(event.action)}</p>
          </div>
          <div className="text-xs uppercase tracking-[0.14em] text-textSecondary">{formatAdminTimestamp(event.occurredAt)}</div>
        </div>
      </div>
    </div>
  )
}

export function QueueItem({ title, detail, tone, href, meta, cta = 'Open surface' }: { title: string; detail: string; tone: Tone; href: string; meta: string; cta?: string }) {
  return (
    <Link href={href} className="group rounded-2xl border border-white/[0.08] bg-bg/50 p-4 transition-colors hover:border-accent/25 hover:bg-panel/80">
      <div className="flex items-start justify-between gap-3">
        <Badge label={meta} tone={tone} />
        <ArrowRight className="h-4 w-4 text-textSecondary transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
      </div>
      <p className="mt-4 text-base font-semibold text-textPrimary">{title}</p>
      <p className="mt-2 text-sm leading-6 text-textSecondary">{detail}</p>
      <p className="mt-4 text-[11px] uppercase tracking-[0.14em] text-accent">{cta}</p>
    </Link>
  )
}

export function ReleaseRail({ version }: { version: AssessmentVersion }) {
  const steps = getVersionReleaseSteps(version)

  return (
    <div className="space-y-3">
      {steps.map((step, index) => {
        const tone = toneForStatus(step.state)
        return (
          <div key={step.label} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className={clsx('mt-1 h-3.5 w-3.5 rounded-full border', toneClasses[tone])} />
              {index < steps.length - 1 ? <span className="mt-2 h-full w-px bg-white/[0.08]" /> : null}
            </div>
            <div className="flex-1 rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-textPrimary">{step.label}</p>
                <Badge label={step.state} tone={tone} />
              </div>
              <p className="mt-2 text-sm leading-6 text-textSecondary">{step.detail}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export function EmptyState({ title, detail, action }: { title: string; detail: string; action?: ReactNode }) {
  return (
    <div className="rounded-[1.25rem] border border-dashed border-white/[0.12] bg-bg/35 px-5 py-10 text-center">
      <LayoutTemplate className="mx-auto h-10 w-10 text-textSecondary" />
      <p className="mt-4 text-base font-semibold text-textPrimary">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-textSecondary">{detail}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}

export function PanelActionRow({ primaryHref, primaryLabel, secondaryHref, secondaryLabel }: { primaryHref?: string; primaryLabel?: string; secondaryHref?: string; secondaryLabel?: string }) {
  return (
    <div className="flex flex-wrap gap-2">
      {primaryHref && primaryLabel ? <Button href={primaryHref} variant="secondary">{primaryLabel}</Button> : null}
      {secondaryHref && secondaryLabel ? <Button href={secondaryHref} variant="ghost">{secondaryLabel}</Button> : null}
    </div>
  )
}
