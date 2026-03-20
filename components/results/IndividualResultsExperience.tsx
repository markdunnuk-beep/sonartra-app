'use client'

import React from 'react'

import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { ARCHETYPE_META } from '@/components/results/archetypeMeta'
import type { IndividualResultsIntelligenceActionModel } from '@/lib/results/individual-results-intelligence'
import type { IndividualAssessmentCardModel, IndividualResultDomainBarModel, IndividualResultDomainSectionModel, IndividualResultsPresentationModel } from '@/lib/results/individual-results-presentation'

function ResultBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'muted' }) {
  const toneClass =
    tone === 'accent'
      ? 'border-accent/30 bg-accent/12 text-[#CBE2FF]'
      : tone === 'muted'
        ? 'border-white/[0.07] bg-white/[0.04] text-textSecondary'
        : 'border-white/[0.08] bg-bg/70 text-textPrimary/88'

  return <span className={`rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.16em] ${toneClass}`}>{children}</span>
}

function DistributionBar({ label, value }: IndividualResultDomainBarModel) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[13px] font-medium tracking-[0.01em] text-[#A5B1C2]">{label}</span>
        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#94A7BE]">{value}%</span>
      </div>
      <div className="h-3.5 overflow-hidden rounded-full bg-[#101926] ring-1 ring-white/[0.05]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#5879A6] via-[#79A6D8] to-[#B7DAFF] shadow-[0_0_22px_-8px_rgba(133,186,255,0.98)]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function DomainListCard({
  title,
  items,
  tone = 'neutral',
  compact = false,
}: {
  title: string
  items: string[]
  tone?: 'neutral' | 'strength' | 'watchout' | 'focus'
  compact?: boolean
}) {
  const toneClass =
    tone === 'strength'
      ? 'border-emerald-300/[0.1] bg-[linear-gradient(180deg,rgba(14,32,28,0.58),rgba(255,255,255,0.02))]'
      : tone === 'watchout'
        ? 'border-amber-300/[0.11] bg-[linear-gradient(180deg,rgba(38,27,14,0.5),rgba(255,255,255,0.02))]'
        : tone === 'focus'
          ? 'border-accent/14 bg-[linear-gradient(180deg,rgba(17,31,49,0.56),rgba(255,255,255,0.02))]'
          : 'border-white/[0.06] bg-white/[0.025]'

  const bulletClass =
    tone === 'strength'
      ? 'bg-emerald-300/80'
      : tone === 'watchout'
        ? 'bg-amber-300/80'
        : tone === 'focus'
          ? 'bg-accent/80'
          : 'bg-accent/70'

  const textClass =
    tone === 'strength'
      ? 'text-[#C4D5C9]'
      : tone === 'watchout'
        ? 'text-[#9FA8B4]'
        : tone === 'focus'
          ? 'text-[#AEBFD5]'
          : 'text-textSecondary'

  return (
    <div className={`rounded-[1.125rem] border p-4 sm:p-5 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#96AECB]">{title}</p>
      <ul className={`mt-3 text-sm leading-6 ${textClass} ${compact ? 'space-y-2' : 'space-y-3'}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className={`mt-2 h-1.5 w-1.5 rounded-full ${bulletClass}`} />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function AssessmentHeader({ assessment, expanded, onToggle }: { assessment: IndividualAssessmentCardModel; expanded: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <ResultBadge tone={expanded ? 'accent' : 'muted'}>{assessment.statusLabel}</ResultBadge>
          <ResultBadge>{assessment.versionLabel}</ResultBadge>
          <ResultBadge tone="muted">Completed {assessment.completedLabel}</ResultBadge>
        </div>
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-xl font-semibold tracking-tight text-textPrimary sm:text-[1.45rem]">{assessment.title}</h2>
          </div>
          {assessment.summary ? <p className="max-w-3xl text-sm leading-[1.35rem] text-textSecondary">{assessment.summary}</p> : null}
        </div>
      </div>

      <button
        type="button"
        className="flex min-h-10 items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-bg/55 px-4 py-2.5 text-left text-sm text-textSecondary transition hover:border-accent/30 hover:text-textPrimary lg:min-w-[208px]"
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="font-medium text-textPrimary">{expanded ? 'Hide full results' : 'Review full results'}</span>
        <span className="text-lg leading-none text-accent">{expanded ? '−' : '+'}</span>
      </button>
    </div>
  )
}

function HowToUseReportSection({ assessment }: { assessment: IndividualAssessmentCardModel }) {
  return (
    <div className="rounded-[1.2rem] border border-white/[0.05] bg-[#0A1018]/76 px-4 py-3.5 sm:px-5">
      <div className="space-y-1.5">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7990AE]">How to Use This Report</p>
          <p className="max-w-3xl text-[13px] leading-[1.35rem] text-[#8FA0B4]">{assessment.howToUse.summary}</p>
        </div>
      </div>
    </div>
  )
}

function ArchetypeIdentityCard({
  label,
  note,
  archetypeKey,
}: {
  label: string
  note: string
  archetypeKey?: string
}) {
  const archetype = ARCHETYPE_META.find((item) => item.key === archetypeKey)
  const Icon = archetype?.renderIcon

  return (
    <div className="flex min-w-[214px] items-center gap-3.5 rounded-[1.25rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-4">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-[#D5E8FF] shadow-[0_0_22px_-14px_rgba(137,189,255,0.95)]">
        {Icon ? <Icon className="h-6 w-6" /> : <span className="text-sm font-semibold">{label.charAt(0)}</span>}
      </div>
      <div>
        <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{note}</p>
        <p className="text-[1.05rem] font-semibold tracking-[0.01em] text-[#F2F6FD]">{label}</p>
      </div>
    </div>
  )
}

function ArchetypeOverviewSection({ assessment }: { assessment: IndividualAssessmentCardModel }) {
  const summary = assessment.archetype.summary

  return (
    <Card className="border-accent/18 bg-[linear-gradient(180deg,rgba(22,34,51,0.98),rgba(12,18,28,0.96))] px-5 py-6 sm:px-6 sm:py-7">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">Sonartra Archetype Overview</p>
              <h3 className="text-[1.4rem] font-semibold tracking-tight text-[#F0F5FD] sm:text-[1.55rem]">
                Primary identity summary for how this person is most likely to operate.
              </h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {summary ? (
                <>
                  <ArchetypeIdentityCard label={summary.primaryLabel} note="Primary archetype" archetypeKey={summary.primaryKey} />
                  {summary.secondaryLabel ? (
                    <ArchetypeIdentityCard label={summary.secondaryLabel} note="Secondary archetype" archetypeKey={summary.secondaryKey} />
                  ) : null}
                </>
              ) : (
                <ArchetypeIdentityCard label="Archetype unavailable" note="Primary archetype" />
              )}
            </div>
          </div>

          <div className="max-w-md rounded-[1.25rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(10,17,28,0.82),rgba(12,18,27,0.6))] px-4 py-4 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8FA6C5]">Quick read</p>
            <p className="mt-2 text-sm leading-6 text-[#B8C7DA]">{assessment.archetype.personalSummary}</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DomainListCard title="Strengths" items={assessment.archetype.strengths} tone="strength" compact />
          <DomainListCard title="Watchouts" items={assessment.archetype.watchouts} tone="watchout" compact />
          <DomainListCard title="Focus Areas" items={assessment.archetype.focusAreas} tone="focus" compact />
        </div>
      </div>
    </Card>
  )
}

function DomainSection({ section }: { section: IndividualResultDomainSectionModel }) {
  const highestSignal = section.bars.reduce<IndividualResultDomainBarModel | null>((best, bar) => {
    if (!best || bar.value > best.value) return bar
    return best
  }, null)

  return (
    <Card className="border-white/[0.06] bg-panel/[0.82] px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-5">
        <div className="space-y-3 border-b border-white/[0.05] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">{section.title}</p>
              <h3 className="text-[1.05rem] font-semibold tracking-tight text-textPrimary">{section.primaryProfile}</h3>
            </div>
            <ResultBadge tone="muted">Profile + guidance</ResultBadge>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-[#97A7BB]">{section.description}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)] xl:gap-5">
          <div className="rounded-[1.25rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(10,17,26,0.92),rgba(11,18,28,0.72))] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">Distribution</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">
                Highest signal: {highestSignal?.label ?? 'Unavailable'}
              </p>
            </div>
            <div className="space-y-4">
              {section.bars.length ? (
                section.bars.map((bar) => <DistributionBar key={`${section.key}-${bar.label}`} {...bar} />)
              ) : (
                <p className="text-sm leading-6 text-textSecondary">No scored signal distribution is available yet for this domain.</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <DomainListCard title="Strengths" items={section.strengths} tone="strength" />
            <DomainListCard title="Watchouts" items={section.watchouts} tone="watchout" />
          </div>
        </div>
      </div>
    </Card>
  )
}

function PerformanceImplicationsSection({ assessment }: { assessment: IndividualAssessmentCardModel }) {
  return (
    <Card className="border-accent/14 bg-[linear-gradient(180deg,rgba(17,25,38,0.98),rgba(12,18,28,0.94))] px-5 py-6 sm:px-6 sm:py-7">
      <div className="space-y-6">
        <div className="space-y-2 border-b border-white/[0.06] pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">Performance Implications</p>
          <h3 className="text-xl font-semibold tracking-tight text-textPrimary">
            Where this person creates value, where risk appears, and what to tighten next.
          </h3>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DomainListCard title="Where performance is strongest" items={assessment.performanceImplications.performsBest} tone="strength" compact />
          <DomainListCard title="Where performance risk appears" items={assessment.performanceImplications.risks} tone="watchout" compact />
          <DomainListCard title="Recommended focus" items={assessment.performanceImplications.focus} tone="focus" compact />
        </div>
      </div>
    </Card>
  )
}

function AssessmentResultCard({ assessment }: { assessment: IndividualAssessmentCardModel }) {
  const [expanded, setExpanded] = React.useState(assessment.defaultExpanded)

  return (
    <Card className={expanded ? 'border-accent/15 bg-panel/[0.9]' : 'bg-panel/[0.78]'}>
      <AssessmentHeader assessment={assessment} expanded={expanded} onToggle={() => setExpanded((current) => !current)} />

      {expanded ? (
        <div className="mt-5 space-y-7 border-t border-white/[0.06] pt-5 sm:space-y-8 sm:pt-6">
          <HowToUseReportSection assessment={assessment} />
          <ArchetypeOverviewSection assessment={assessment} />
          {assessment.domains.map((section) => (
            <DomainSection key={section.key} section={section} />
          ))}
          <div className="pt-3 sm:pt-4">
            <PerformanceImplicationsSection assessment={assessment} />
          </div>
        </div>
      ) : null}
    </Card>
  )
}

function IntelligenceMetadata({ items }: { items: string[] }) {
  if (items.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-[13px] text-textSecondary/76">
      {items.map((entry, index) => (
        <React.Fragment key={entry}>
          {index > 0 ? <span aria-hidden="true" className="text-textSecondary/28">•</span> : null}
          <span>{entry}</span>
        </React.Fragment>
      ))}
    </div>
  )
}

function ResultsIntelligenceAction({ action }: { action: IndividualResultsIntelligenceActionModel }) {
  return (
    <div className="rounded-[1.15rem] border border-white/[0.05] bg-[linear-gradient(180deg,rgba(14,22,33,0.76),rgba(11,18,28,0.62))] p-3.5 sm:p-4">
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">{action.label}</p>
          <h3 className="text-[1.02rem] font-semibold tracking-tight text-textPrimary sm:text-[1.08rem]">{action.title}</h3>
          <p className="text-sm leading-5 text-textSecondary">{action.rationale}</p>
        </div>

        <IntelligenceMetadata items={action.metadata} />

        {action.cta ? (
          <div className="pt-0.5">
            <Button href={action.cta.href} className="w-full justify-center px-4 sm:w-auto">
              {action.cta.label}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ResultsIntelligencePanel({ model }: { model: IndividualResultsPresentationModel['intelligence'] }) {
  return (
    <section aria-label="Results overview">
      <Card className="border border-white/[0.07] bg-[linear-gradient(180deg,rgba(14,21,31,0.98),rgba(10,15,24,0.96))] px-5 py-5 sm:px-6 sm:py-6">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.18fr)_minmax(300px,0.82fr)] xl:items-start xl:gap-5">
          <div className="space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-accent/78">{model.eyebrow}</p>
              <h2 className="text-[1.45rem] font-semibold tracking-tight text-textPrimary sm:text-[1.6rem]">{model.summaryHeadline}</h2>
              <p className="max-w-3xl text-sm leading-6 text-textSecondary">{model.summaryOverview}</p>
            </div>

            <IntelligenceMetadata items={model.metadata} />

            <div className="grid gap-3 lg:grid-cols-2">
              <div className="space-y-1.5 rounded-[1.1rem] border border-white/[0.05] bg-white/[0.02] p-4">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">{model.priorityLabel}</p>
                <p className="text-sm leading-[1.35rem] text-textSecondary">{model.priorityDetail}</p>
              </div>

              {model.unlocksDetail ? (
                <div className="space-y-1.5 rounded-[1.1rem] border border-white/[0.05] bg-white/[0.02] p-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">{model.unlocksLabel}</p>
                  <p className="text-sm leading-[1.35rem] text-textSecondary">{model.unlocksDetail}</p>
                </div>
              ) : null}
            </div>
          </div>

          <ResultsIntelligenceAction action={model.action} />
        </div>
      </Card>
    </section>
  )
}

export function IndividualResultsExperience({ model }: { model: IndividualResultsPresentationModel }) {
  return (
    <div className="pb-12 pt-4 sm:pt-5">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-4">
        <Card className="overflow-hidden border-white/[0.07] bg-[linear-gradient(180deg,rgba(14,20,30,0.98),rgba(10,15,24,0.96))] px-5 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <ResultBadge tone="accent">Live result</ResultBadge>
              </div>
              <div className="space-y-1.5">
                <h1 className="text-[1.75rem] font-semibold tracking-tight text-textPrimary md:text-[2rem]">{model.title}</h1>
                <p className="max-w-2xl text-sm leading-[1.35rem] text-textSecondary">{model.subtitle}</p>
              </div>
            </div>
          </div>
        </Card>

        <ResultsIntelligencePanel model={model.intelligence} />

        <div className="space-y-5">
          {model.assessments.map((assessment) => (
            <AssessmentResultCard key={assessment.id} assessment={assessment} />
          ))}
        </div>
      </div>
    </div>
  )
}
