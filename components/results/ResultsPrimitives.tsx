import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { clsx } from 'clsx'
import React, { ReactNode } from 'react'

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
  dominantArchitecture,
  keySignalPattern,
  operationalImplication,
}: {
  dominant: string
  secondary: string
  summary: string
  standoutFinding: string
  confidence: string
  dominantArchitecture?: string
  keySignalPattern?: string
  operationalImplication?: string
}) {
  const architectureInsight = dominantArchitecture ?? `Primary behavioural architecture is anchored in ${dominant} with ${secondary} as the stabilising secondary signal.`

  return (
    <Card className="space-y-6 border-accent/25 bg-panel/90">
      <div className="flex flex-wrap items-center gap-2">
        <SignalChip tone="accent">Dominant: {dominant}</SignalChip>
        <SignalChip tone="neutral">Secondary: {secondary}</SignalChip>
        <SignalChip tone="neutral">Confidence: {confidence}</SignalChip>
      </div>
      <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] lg:items-start">
        <NarrativeSummary
          title="Executive Summary"
          dominantArchitecture={architectureInsight}
          keySignalPattern={keySignalPattern}
          operationalImplication={operationalImplication}
        >
          {summary}
        </NarrativeSummary>
        <InsightCard title="Standout Finding" detail={standoutFinding} compact emphasized />
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

export function TraitScoreCard({
  name,
  score,
  detail,
  descriptor,
  strengthLabel,
  comparisonRows,
}: {
  name: string
  score: number
  detail?: string
  descriptor?: string
  strengthLabel?: string
  comparisonRows?: Array<{ label: string; value: number }>
}) {
  return (
    <Card className="space-y-4 border-border/80 bg-panel/70" interactive>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-1">
          <h3 className="text-sm font-medium uppercase tracking-[0.12em] text-textSecondary">{name}</h3>
          {strengthLabel ? <p className="text-[11px] uppercase tracking-[0.14em] text-accent/80">{strengthLabel}</p> : null}
        </div>
        <p className="text-3xl font-semibold tracking-tight text-textPrimary">{score}</p>
      </div>
      <ScoreMeter value={score} />
      <div className="space-y-1">
        {detail ? <p className="text-xs font-medium leading-5 text-textPrimary/90">{detail}</p> : null}
        {descriptor ? <p className="text-xs leading-5 text-textSecondary">{descriptor}</p> : null}
        {comparisonRows?.length ? (
          <div className="pt-1">
            {comparisonRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-textSecondary">
                <span>{row.label}</span>
                <span className="font-semibold text-textPrimary/90">{row.value}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </Card>
  )
}

export function SignalDeltaIndicator({
  delta,
  comparator,
  percentileLabel,
}: {
  delta: number
  comparator: string
  percentileLabel?: string
}) {
  const isPositive = delta >= 0
  const deltaLabel = `${isPositive ? '+' : '−'}${Math.abs(delta)} vs ${comparator}`

  return (
    <div className="flex flex-wrap items-center gap-2">
      <SignalChip tone={isPositive ? 'accent' : 'neutral'}>{deltaLabel}</SignalChip>
      {percentileLabel ? <SignalChip tone="neutral">{percentileLabel}</SignalChip> : null}
    </div>
  )
}

export function SignalDistributionBar({
  label,
  min,
  max,
  value,
  benchmark,
}: {
  label: string
  min: number
  max: number
  value: number
  benchmark?: number
}) {
  const spread = Math.max(max - min, 1)
  const valuePosition = ((value - min) / spread) * 100
  const benchmarkPosition = benchmark === undefined ? undefined : ((benchmark - min) / spread) * 100

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-xs text-textSecondary">
        <p className="uppercase tracking-[0.14em]">{label}</p>
        <p className="font-medium text-textPrimary/90">
          Range {min}–{max}
        </p>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-bg/80">
        <div className="h-full w-full rounded-full bg-gradient-to-r from-[#4f6789] via-[#6a86ad] to-[#8eb2df]" />
        <span className="absolute -top-1 h-4 w-[2px] rounded-full bg-textPrimary" style={{ left: `${valuePosition}%` }} />
        {benchmarkPosition !== undefined ? (
          <span className="absolute -top-0.5 h-3.5 w-[2px] rounded-full bg-accent/90" style={{ left: `${benchmarkPosition}%` }} />
        ) : null}
      </div>
      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.12em] text-textSecondary">
        <span>Observed: {value}</span>
        {benchmark === undefined ? null : <span>Benchmark: {benchmark}</span>}
      </div>
    </div>
  )
}

export function SignalRankList({ title, items }: { title: string; items: Array<{ label: string; score: number; note?: string }> }) {
  const sorted = [...items].sort((a, b) => b.score - a.score)

  return (
    <Card className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{title}</p>
      <ol className="space-y-2">
        {sorted.map((item, index) => (
          <li key={item.label} className="rounded-xl border border-border/70 bg-bg/40 px-3 py-2.5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-textSecondary">Rank {index + 1}</p>
                <p className="text-sm font-medium text-textPrimary">{item.label}</p>
                {item.note ? <p className="text-xs text-textSecondary">{item.note}</p> : null}
              </div>
              <p className="text-xl font-semibold tracking-tight text-textPrimary">{item.score}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  )
}

export function SignalComparisonGrid({
  title,
  description,
  rows,
}: {
  title: string
  description?: string
  rows: Array<{
    signal: string
    subjectLabel: string
    subjectScore: number
    comparisons: Array<{ label: string; score: number; percentileLabel?: string }>
  }>
}) {
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{title}</p>
        {description ? <p className="text-sm text-textSecondary">{description}</p> : null}
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.signal} className="rounded-xl border border-border/70 bg-bg/35 p-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-textSecondary">{row.signal}</p>
                <p className="text-sm text-textPrimary/95">
                  {row.subjectLabel}: <span className="font-semibold">{row.subjectScore}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {row.comparisons.map((comparison) => (
                  <SignalDeltaIndicator
                    key={comparison.label}
                    delta={row.subjectScore - comparison.score}
                    comparator={comparison.label}
                    percentileLabel={comparison.percentileLabel}
                  />
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function ScoreMeter({ value }: { value: number }) {
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg/80">
      <div
        className="h-full rounded-full bg-gradient-to-r from-[#78aef8] via-[#6f9fe8] to-[#8bc0ff] motion-safe:transition-[width] motion-safe:duration-700 motion-safe:ease-out"
        style={{ width: `${value}%` }}
      />
    </div>
  )
}

export function InsightCard({
  title,
  detail,
  compact = false,
  emphasized = false,
}: {
  title: string
  detail: string
  compact?: boolean
  emphasized?: boolean
}) {
  return (
    <Card className={clsx('space-y-2', compact ? 'p-5 sm:p-5' : '', emphasized ? 'border-accent/35 bg-accent/5' : '')}>
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{title}</p>
      <p className="text-sm leading-6 text-textPrimary/95">{detail}</p>
    </Card>
  )
}

export function InterpretationPanel({
  label,
  content,
  emphasis = 'supporting',
}: {
  label: string
  content: string
  emphasis?: 'primary' | 'supporting' | 'context'
}) {
  const emphasisStyles = {
    primary: 'border-accent/35 bg-panel',
    supporting: 'border-border/90 bg-panel/75',
    context: 'border-border/70 bg-bg/50',
  }

  return (
    <Card className={clsx('space-y-2', emphasisStyles[emphasis])}>
      <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">{label}</p>
      <p className={clsx('text-sm leading-6', emphasis === 'primary' ? 'text-textPrimary/95' : 'text-textSecondary')}>{content}</p>
    </Card>
  )
}

export function RecommendationBlock({
  title,
  items,
  categories,
  ctaLabel,
}: {
  title: string
  items: Array<string | { label: string; detail: string }>
  categories?: Array<{ category: string; items: Array<string | { label: string; detail: string }> }>
  ctaLabel: string
}) {
  const sections = categories?.length ? categories : [{ category: 'Priority Actions', items }]

  return (
    <Card className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Action Framing</p>
        <h3 className="mt-2 text-lg font-semibold tracking-tight text-textPrimary">{title}</h3>
      </div>
      <div className="space-y-4">
        {sections.map((section) => (
          <div key={section.category} className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-textSecondary">{section.category}</p>
            <ul className="space-y-2">
              {section.items.map((item) => (
                <li
                  key={`${section.category}-${typeof item === 'string' ? item : item.label}`}
                  className="rounded-xl border border-border/70 bg-bg/40 px-3 py-2 text-sm text-textSecondary"
                >
                  {typeof item === 'string' ? (
                    item
                  ) : (
                    <div>
                      <p className="font-medium text-textPrimary/95">{item.label}</p>
                      <p className="mt-1 text-xs leading-5 text-textSecondary">{item.detail}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <Button>{ctaLabel}</Button>
    </Card>
  )
}

export function SignalVarianceIndicator({
  score,
  insight,
}: {
  score: number
  insight: string
}) {
  const profile =
    score <= 12
      ? { label: 'Balanced', descriptor: 'Signal expression is tightly consistent across the cohort.' }
      : score <= 22
        ? { label: 'Clustered', descriptor: 'Signals are concentrated around a dominant operating pattern.' }
        : score <= 34
          ? { label: 'Fragmented', descriptor: 'Diverse behavioural expression requires stronger coordination design.' }
          : { label: 'Volatile', descriptor: 'Signal spread indicates elevated execution instability under pressure.' }

  return (
    <Card className="space-y-3 border-border/80 bg-panel/70">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Signal Variance Diagnostic</p>
      <div className="flex items-center justify-between gap-3">
        <p className="text-3xl font-semibold tracking-tight text-textPrimary">{score}</p>
        <SignalChip tone={score > 34 ? 'accent' : 'neutral'}>{profile.label}</SignalChip>
      </div>
      <p className="text-xs leading-5 text-textSecondary">{profile.descriptor}</p>
      <p className="text-xs font-medium leading-5 text-textPrimary/95">{insight}</p>
    </Card>
  )
}

export function TeamCompatibilityMatrix({
  rows,
}: {
  rows: Array<{
    pairing: string
    primaryStyle: string
    leadershipPattern: string
    compatibility: string
    frictionPoint: string
  }>
}) {
  return (
    <Card className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Team Compatibility Matrix</p>
        <p className="text-sm text-textSecondary">Behavioural style interactions mapped to execution implications.</p>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.pairing} className="rounded-xl border border-border/70 bg-bg/35 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium text-textPrimary">{row.pairing}</p>
              <SignalChip tone="neutral">{row.compatibility}</SignalChip>
            </div>
            <div className="mt-2 grid gap-2 text-xs text-textSecondary sm:grid-cols-3">
              <p>
                <span className="uppercase tracking-[0.13em] text-textSecondary/80">Primary Style:</span> {row.primaryStyle}
              </p>
              <p>
                <span className="uppercase tracking-[0.13em] text-textSecondary/80">Leadership Pattern:</span> {row.leadershipPattern}
              </p>
              <p>
                <span className="uppercase tracking-[0.13em] text-textSecondary/80">Potential Friction:</span> {row.frictionPoint}
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function LeadershipBalancePanel({
  distribution,
}: {
  distribution: Array<{ archetype: 'Strategist' | 'Operator' | 'Integrator' | 'Catalyst'; share: number; note: string }>
}) {
  const dominant = [...distribution].sort((a, b) => b.share - a.share)[0]
  const underrepresented = distribution.filter((item) => item.share <= 18).map((item) => item.archetype)

  return (
    <Card className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Leadership Architecture Balance</p>
      <div className="space-y-3">
        {distribution.map((item) => (
          <div key={item.archetype} className="space-y-1">
            <div className="flex items-center justify-between text-xs text-textSecondary">
              <span className="uppercase tracking-[0.13em]">{item.archetype}</span>
              <span className="font-semibold text-textPrimary/95">{item.share}%</span>
            </div>
            <ScoreMeter value={item.share} />
            <p className="text-[11px] leading-5 text-textSecondary">{item.note}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <InsightCard title="Dominant Type" detail={`${dominant.archetype} leadership is currently dominant.`} compact />
        <InsightCard
          title="Underrepresented Types"
          detail={underrepresented.length ? underrepresented.join(', ') : 'No archetype is materially underrepresented.'}
          compact
        />
      </div>
    </Card>
  )
}

export function RiskSignalPanel({
  risks,
}: {
  risks: Array<{ category: string; signal: 'Low' | 'Moderate' | 'Elevated'; rationale: string }>
}) {
  return (
    <Card className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Organisational Risk Indicators</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {risks.map((risk) => (
          <div key={risk.category} className="rounded-xl border border-border/70 bg-bg/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs uppercase tracking-[0.13em] text-textSecondary">{risk.category}</p>
              <SignalChip tone={risk.signal === 'Elevated' ? 'accent' : 'neutral'}>{risk.signal}</SignalChip>
            </div>
            <p className="mt-2 text-xs leading-5 text-textSecondary">{risk.rationale}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function CrossLayerInsightPanel({
  insights,
}: {
  insights: Array<{ title: string; observation: string; implication: string }>
}) {
  return (
    <Card className="space-y-4 border-accent/20 bg-panel/75">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Cross-Layer Intelligence Synthesis</p>
      <div className="space-y-2">
        {insights.map((insight) => (
          <div key={insight.title} className="rounded-xl border border-border/70 bg-bg/35 p-3">
            <p className="text-sm font-medium text-textPrimary">{insight.title}</p>
            <p className="mt-1 text-xs leading-5 text-textSecondary">{insight.observation}</p>
            <p className="mt-1 text-xs font-medium leading-5 text-textPrimary/95">Implication: {insight.implication}</p>
          </div>
        ))}
      </div>
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

export function ResultStatusBadge({ status }: { status: 'complete' | 'failed' | 'empty' | 'unauthenticated' }) {
  const tone = status === 'complete' ? 'accent' : 'neutral'
  return <SignalChip tone={tone}>Status: {status}</SignalChip>
}

export function ResultMetadataGrid({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <Card className="space-y-3 border-border/80 bg-panel/70">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Result metadata</p>
      <div className="space-y-2">
        {items.map((item) => (
          <div key={item.label} className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-bg/35 px-3 py-2">
            <p className="text-xs uppercase tracking-[0.14em] text-textSecondary">{item.label}</p>
            <p className="text-xs font-medium text-textPrimary/95">{item.value}</p>
          </div>
        ))}
      </div>
    </Card>
  )
}

export function SignalScoreRow({
  label,
  normalisedScore,
  relativeShare,
  rank,
  isPrimary,
  isSecondary,
}: {
  label: string
  normalisedScore: number
  relativeShare: number
  rank: number | null
  isPrimary: boolean
  isSecondary: boolean
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-bg/35 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-textPrimary">{label}</p>
        <div className="flex items-center gap-2">
          {isPrimary ? <SignalChip tone="accent">Primary</SignalChip> : null}
          {isSecondary ? <SignalChip tone="neutral">Secondary</SignalChip> : null}
          {rank ? <SignalChip tone="neutral">Rank {rank}</SignalChip> : null}
        </div>
      </div>
      <div className="mt-3">
        <ScoreMeter value={normalisedScore * 100} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs text-textSecondary">
        <span>Normalised: {Math.round(normalisedScore * 100)}%</span>
        <span>Share: {Math.round(relativeShare * 100)}%</span>
      </div>
    </div>
  )
}

export function ResultEmptyStatePanel({
  title,
  description,
  ctaLabel,
  ctaHref,
}: {
  title: string
  description: string
  ctaLabel: string
  ctaHref: string
}) {
  return (
    <Card className="space-y-4 border-border/80 bg-panel/70">
      <h2 className="text-xl font-semibold tracking-tight text-textPrimary">{title}</h2>
      <p className="text-sm leading-6 text-textSecondary">{description}</p>
      <Button href={ctaHref} variant="secondary">
        {ctaLabel}
      </Button>
    </Card>
  )
}

export function ResultFailedStatePanel({ title, description, detail }: { title: string; description: string; detail?: string }) {
  return (
    <Card className="space-y-4 border-border/80 bg-panel/70">
      <h2 className="text-xl font-semibold tracking-tight text-textPrimary">{title}</h2>
      <p className="text-sm leading-6 text-textSecondary">{description}</p>
      {detail ? <p className="text-xs uppercase tracking-[0.14em] text-textSecondary">{detail}</p> : null}
    </Card>
  )
}

export function NarrativeSummary({
  title,
  children,
  dominantArchitecture,
  keySignalPattern,
  operationalImplication,
}: {
  title: string
  children: ReactNode
  dominantArchitecture?: string
  keySignalPattern?: string
  operationalImplication?: string
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">{title}</p>
      <p className="text-sm leading-6 text-textPrimary/95">{children}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        {dominantArchitecture ? <NarrativeKeyPoint title="Dominant Architecture" detail={dominantArchitecture} /> : null}
        {keySignalPattern ? <NarrativeKeyPoint title="Key Signal Pattern" detail={keySignalPattern} /> : null}
        {operationalImplication ? <NarrativeKeyPoint title="Operational Implication" detail={operationalImplication} /> : null}
      </div>
    </div>
  )
}

function NarrativeKeyPoint({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-xl border border-border/65 bg-bg/50 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.13em] text-textSecondary">{title}</p>
      <p className="mt-1 text-xs leading-5 text-textSecondary">{detail}</p>
    </div>
  )
}
