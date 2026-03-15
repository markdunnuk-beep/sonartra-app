import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'
import { ReactNode } from 'react'

type ResultsShellProps = {
  title: string
  subtitle: string
  statusLabel?: string
  children: ReactNode
}

export function ResultsWorkspaceShell({ title, subtitle, statusLabel = 'Signals Results', children }: ResultsShellProps) {
  return (
    <section className="space-y-8 lg:space-y-10">
      <header className="surface space-y-5 px-6 py-6 sm:px-8 sm:py-7">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="eyebrow">{statusLabel}</p>
          <SignalChip tone="neutral">Assessment Complete</SignalChip>
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-semibold tracking-tight text-textPrimary md:text-4xl">{title}</h1>
          <p className="max-w-3xl text-sm leading-6 text-textSecondary">{subtitle}</p>
        </div>
      </header>
      <div className="space-y-5 lg:space-y-6">{children}</div>
    </section>
  )
}

export function ResultsHero({
  dominant,
  secondary,
  summary,
  standoutFinding,
  confidence,
}: {
  dominant: string
  secondary: string
  summary: string
  standoutFinding: string
  confidence: string
}) {
  return (
    <Card className="space-y-5 border-accent/20 bg-panel/90">
      <div className="flex flex-wrap items-center gap-2">
        <SignalChip tone="accent">Dominant: {dominant}</SignalChip>
        <SignalChip tone="neutral">Secondary: {secondary}</SignalChip>
        <SignalChip tone="neutral">Confidence: {confidence}</SignalChip>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <NarrativeSummary title="Executive Summary">{summary}</NarrativeSummary>
        <InsightCard title="Standout Finding" detail={standoutFinding} compact />
      </div>
    </Card>
  )
}

export function ResultsSectionBlock({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight text-textPrimary">{title}</h2>
        {description ? <p className="text-sm text-textSecondary">{description}</p> : null}
      </div>
      {children}
    </section>
  )
}

export function TraitScoreCard({ name, score, detail }: { name: string; score: number; detail?: string }) {
  return (
    <Card className="space-y-4" interactive>
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-textSecondary">{name}</h3>
        <p className="text-2xl font-semibold text-textPrimary">{score}</p>
      </div>
      <ScoreMeter value={score} />
      {detail ? <p className="text-xs leading-5 text-textSecondary">{detail}</p> : null}
    </Card>
  )
}

export function ScoreMeter({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg/80">
      <div className="h-full rounded-full bg-gradient-to-r from-[#78aef8] via-[#6f9fe8] to-[#8bc0ff]" style={{ width: `${value}%` }} />
    </div>
  )
}

export function InsightCard({ title, detail, compact = false }: { title: string; detail: string; compact?: boolean }) {
  return (
    <Card className={clsx('space-y-2', compact ? 'p-5 sm:p-5' : '')}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{title}</p>
      <p className="text-sm leading-6 text-textPrimary/95">{detail}</p>
    </Card>
  )
}

export function InterpretationPanel({ label, content }: { label: string; content: string }) {
  return (
    <Card className="space-y-2 border-border/90 bg-panel/75">
      <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">{label}</p>
      <p className="text-sm leading-6 text-textSecondary">{content}</p>
    </Card>
  )
}

export function RecommendationBlock({ title, items, ctaLabel }: { title: string; items: string[]; ctaLabel: string }) {
  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Action Framing</p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-textPrimary">{title}</h3>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item} className="rounded-xl border border-border/70 bg-bg/40 px-3 py-2 text-sm text-textSecondary">
            {item}
          </li>
        ))}
      </ul>
      <Button>{ctaLabel}</Button>
    </Card>
  )
}

export function SignalChip({ children, tone = 'neutral' }: { children: ReactNode; tone?: 'neutral' | 'accent' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-full border px-3 py-1 text-[10.5px] font-semibold uppercase tracking-[0.14em]',
        tone === 'accent' ? 'border-accent/40 bg-accent/15 text-[#b8d7ff]' : 'border-border/70 bg-bg/70 text-textSecondary',
      )}
    >
      {children}
    </span>
  )
}

export function NarrativeSummary({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{title}</p>
      <p className="text-sm leading-6 text-textSecondary">{children}</p>
    </div>
  )
}
