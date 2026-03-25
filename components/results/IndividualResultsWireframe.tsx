import React from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'

type AssessmentCardModel = {
  name: string
  version: string
  completedOn: string
  status: string
  expanded?: boolean
  summary?: string
}

type DomainBar = {
  label: string
  value: number
}

type DomainSectionModel = {
  title: string
  primaryProfile: string
  description: string
  strengths: string[]
  watchouts: string[]
  bars: DomainBar[]
}

const assessments: AssessmentCardModel[] = [
  {
    name: 'Sonartra Signals',
    version: 'Version 2.3',
    completedOn: '19 Mar 2026',
    status: 'Latest assessment',
    expanded: true,
  },
  {
    name: 'Sonartra Signals',
    version: 'Version 2.1',
    completedOn: '17 Nov 2025',
    status: 'Archived snapshot',
    summary: 'Analyst–Driver — structured, autonomous, outcome-focused.',
  },
]

const archetypeCards = {
  primary: {
    label: 'Analyst',
    note: 'Primary archetype',
    icon: 'A',
  },
  secondary: {
    label: 'Driver',
    note: 'Secondary archetype',
    icon: 'D',
  },
  summary:
    'Mark operates as an Analyst–Driver: structured, evidence-led, and comfortable pushing for progress without losing control.',
  strengths: [
    'Applies rigour without stalling momentum.',
    'Keeps standards high under pressure.',
    'Creates clarity when ownership is blurred.',
  ],
  watchouts: [
    'Can turn blunt when pace outruns alignment.',
    'May under-signal support while raising the bar.',
    'Can narrow consultation once evidence feels sufficient.',
  ],
  focus: [
    'Invite challenge before direction hardens.',
    'Balance pace with visible alignment.',
    'Make trade-offs explicit when standards stay high.',
  ],
}

const domainSections: DomainSectionModel[] = [
  {
    title: 'Behaviour Style',
    primaryProfile: 'Primary profile: Analyst–Driver',
    description: 'Mark is structured, data-driven, and outcome-focused, with a clear bias for accuracy before speed.',
    strengths: ['Decides with evidence and control.', 'Turns complexity into clear next steps.', 'Protects quality while moving work forward.'],
    watchouts: ['Can wait for proof before social alignment.', 'May sound abrupt when urgency spikes.', 'Can underplay the need for context-setting.'],
    bars: [
      { label: 'Driver', value: 73 },
      { label: 'Influencer', value: 28 },
      { label: 'Stabiliser', value: 46 },
      { label: 'Analyst', value: 88 },
    ],
  },
  {
    title: 'Motivators',
    primaryProfile: 'Primary profile: Mastery and autonomy',
    description: 'Mark is energised by difficult problems, independent thinking, and environments where standards are explicit.',
    strengths: ['Leans into stretch with clear ownership.', 'Commits hard when outcomes are measurable.', 'Builds momentum through mastery and progress.'],
    watchouts: ['Disengages when work feels vague or political.', 'Loses patience with low-rigour calls.', 'Pushes back on unnecessary oversight.'],
    bars: [
      { label: 'Autonomy', value: 84 },
      { label: 'Recognition', value: 34 },
      { label: 'Purpose', value: 67 },
      { label: 'Mastery', value: 91 },
    ],
  },
  {
    title: 'Leadership',
    primaryProfile: 'Primary profile: Directed clarity',
    description: 'Mark leads best by setting standards, defining decision logic, and creating confidence through precision.',
    strengths: ['Clarifies direction when teams need structure.', 'Raises quality with explicit expectations.', 'Stays composed while making hard calls.'],
    watchouts: ['Can underplay encouragement while correcting course.', 'May assume low-context direction is enough.', 'Can become too task-heavy under pressure.'],
    bars: [
      { label: 'Direction', value: 86 },
      { label: 'Coaching', value: 51 },
      { label: 'Delegation', value: 74 },
      { label: 'Inspiration', value: 38 },
    ],
  },
  {
    title: 'Conflict',
    primaryProfile: 'Primary profile: Direct but contained',
    description: 'Mark is likely to stay composed in tension but may become blunt when pace overtakes alignment.',
    strengths: ['Addresses issues early when standards slip.', 'Separates signal from emotion in difficult moments.', 'Prefers clean resolution over long friction.'],
    watchouts: ['Can move to the answer too quickly.', 'May miss quiet resistance.', 'Can sound more final than intended.'],
    bars: [
      { label: 'Directness', value: 82 },
      { label: 'Diplomacy', value: 42 },
      { label: 'Patience', value: 57 },
      { label: 'Escalation', value: 31 },
    ],
  },
  {
    title: 'Culture',
    primaryProfile: 'Primary profile: High standards environment',
    description: 'Mark works best where expectations are explicit, accountability is shared, and decisions follow clear logic.',
    strengths: ['Thrives in clear, performance-led teams.', 'Adds structure in ambiguous environments.', 'Backs cultures that reward substance over noise.'],
    watchouts: ['Can find highly consensus-driven settings slow.', 'May withdraw when ownership is unclear.', 'Can be sceptical of symbolic culture activity.'],
    bars: [
      { label: 'Clarity', value: 92 },
      { label: 'Collaboration', value: 63 },
      { label: 'Experimentation', value: 54 },
      { label: 'Stability', value: 76 },
    ],
  },
  {
    title: 'Stress',
    primaryProfile: 'Primary profile: Controlled intensity',
    description: 'Under pressure, Mark becomes more exacting, more concise, and more focused on controlling outcomes.',
    strengths: ['Maintains standards as complexity rises.', 'Stays useful in tense moments.', 'Can stabilise teams through calm prioritisation.'],
    watchouts: ['May signal less empathy when overloaded.', 'Can tighten control instead of sharing constraints.', 'May overfunction instead of redistributing load.'],
    bars: [
      { label: 'Composure', value: 81 },
      { label: 'Pressure sensitivity', value: 39 },
      { label: 'Control need', value: 87 },
      { label: 'Recovery', value: 52 },
    ],
  },
]

const performanceImplications = {
  performsBest: [
    'Roles with clear decision rights, autonomy, and visible standards.',
    'Complex delivery where rigour raises execution quality.',
    'Leadership contexts that reward precision and accountability.',
  ],
  risk: [
    'Cross-functional work where alignment needs more airtime.',
    'High-change periods that narrow consultation and tone.',
    'Teams that need visible encouragement before they push back.',
  ],
  focus: [
    'Signal rationale early, before decisions harden.',
    'Use brief check-ins to confirm understanding, not just agreement.',
    'Delegate pressure openly instead of absorbing it through tighter control.',
  ],
}

function WireframeBadge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: 'neutral' | 'accent' | 'muted' }) {
  const toneClass =
    tone === 'accent'
      ? 'border-accent/30 bg-accent/12 text-[#CBE2FF]'
      : tone === 'muted'
        ? 'border-white/[0.07] bg-white/[0.04] text-textSecondary'
        : 'border-white/[0.08] bg-bg/70 text-textPrimary/88'

  return <span className={`rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-[0.14em] ${toneClass}`}>{children}</span>
}

function AssessmentHeader({ assessment }: { assessment: AssessmentCardModel }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <WireframeBadge tone={assessment.expanded ? 'accent' : 'muted'}>{assessment.status}</WireframeBadge>
          <WireframeBadge>{assessment.version}</WireframeBadge>
          <WireframeBadge tone="muted">Completed {assessment.completedOn}</WireframeBadge>
        </div>
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-textPrimary sm:text-2xl">{assessment.name}</h2>
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[11px] uppercase tracking-[0.14em] text-textSecondary">
              {assessment.expanded ? 'Expanded' : 'Collapsed'}
            </span>
          </div>
          {assessment.summary ? <p className="max-w-3xl text-sm leading-6 text-textSecondary">{assessment.summary}</p> : null}
        </div>
      </div>

      <button
        type="button"
        className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-bg/60 px-4 py-3 text-left text-sm text-textSecondary transition hover:border-accent/30 hover:text-textPrimary lg:min-w-[180px]"
        aria-expanded={assessment.expanded}
      >
        <span className="font-medium text-textPrimary">{assessment.expanded ? 'Hide assessment' : 'View assessment'}</span>
        <span className="text-lg leading-none text-accent">{assessment.expanded ? '−' : '+'}</span>
      </button>
    </div>
  )
}

function DistributionBar({ label, value }: DomainBar) {
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

function DomainSection({ section }: { section: DomainSectionModel }) {
  return (
    <Card className="border-white/[0.06] bg-panel/[0.82] px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-5">
        <div className="space-y-3 border-b border-white/[0.05] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">{section.title}</p>
              <h3 className="text-[1.05rem] font-semibold tracking-tight text-textPrimary">{section.primaryProfile}</h3>
            </div>
            <WireframeBadge tone="muted">Profile + guidance</WireframeBadge>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-[#97A7BB]">{section.description}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.22fr)_minmax(320px,0.78fr)] xl:gap-5">
          <div className="rounded-[1.25rem] border border-white/[0.06] bg-[linear-gradient(180deg,rgba(10,17,26,0.92),rgba(11,18,28,0.72))] p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">Distribution</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Highest signal: {section.bars.reduce((best, bar) => (bar.value > best.value ? bar : best)).label}</p>
            </div>
            <div className="space-y-4">
              {section.bars.map((bar) => (
                <DistributionBar key={bar.label} {...bar} />
              ))}
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

function ArchetypeOverviewSection() {
  return (
    <Card className="border-accent/18 bg-[linear-gradient(180deg,rgba(22,34,51,0.98),rgba(12,18,28,0.96))] px-5 py-6 sm:px-6 sm:py-7">
      <div className="space-y-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-5">
            <div className="space-y-2.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">Sonartra Archetype Overview</p>
              <h3 className="text-[1.4rem] font-semibold tracking-tight text-[#F0F5FD] sm:text-[1.55rem]">Primary identity summary for how Mark is most likely to operate.</h3>
            </div>
            <div className="flex flex-wrap gap-4">
              {[archetypeCards.primary, archetypeCards.secondary].map((item) => (
                <div
                  key={item.label}
                  className="flex min-w-[214px] items-center gap-3.5 rounded-[1.25rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(255,255,255,0.018))] px-4 py-4"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-sm font-semibold text-[#D5E8FF] shadow-[0_0_22px_-14px_rgba(137,189,255,0.95)]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{item.note}</p>
                    <p className="text-[1.05rem] font-semibold tracking-[0.01em] text-[#F2F6FD]">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-md rounded-[1.25rem] border border-white/[0.07] bg-[linear-gradient(180deg,rgba(10,17,28,0.82),rgba(12,18,27,0.6))] px-4 py-4 sm:px-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8FA6C5]">Quick read</p>
            <p className="mt-2 text-sm leading-6 text-[#B8C7DA]">{archetypeCards.summary}</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DomainListCard title="Strengths" items={archetypeCards.strengths} tone="strength" compact />
          <DomainListCard title="Watchouts" items={archetypeCards.watchouts} tone="watchout" compact />
          <DomainListCard title="Focus Areas" items={archetypeCards.focus} tone="focus" compact />
        </div>
      </div>
    </Card>
  )
}

function HowToUseReportSection() {
  return (
    <div className="rounded-[1.2rem] border border-white/[0.05] bg-[#0A1018]/76 px-4 py-3.5 sm:px-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-[#7990AE]">How to Use This Report</p>
          <p className="max-w-3xl text-[13px] leading-[1.35rem] text-[#8FA0B4]">
            Sonartra Signals is the core behavioural assessment. Use the six domain reads below to scan how Mark operates, what drives him, how he leads, where friction appears, the culture he fits, and how pressure changes the pattern.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {['Behaviour Style', 'Motivators', 'Leadership', 'Conflict', 'Culture', 'Stress'].map((item) => (
            <div key={item} className="rounded-xl border border-white/[0.05] bg-white/[0.025] px-3 py-2 text-[13px] text-[#AFC0D3]">
              {item}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function PerformanceImplicationsSection() {
  return (
    <Card className="border-accent/14 bg-[linear-gradient(180deg,rgba(17,25,38,0.98),rgba(12,18,28,0.94))] px-5 py-6 sm:px-6 sm:py-7">
      <div className="space-y-6">
        <div className="space-y-2 border-b border-white/[0.06] pb-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">Performance Implications</p>
          <h3 className="text-xl font-semibold tracking-tight text-textPrimary">Where Mark creates value, where risk appears, and what to tighten.</h3>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DomainListCard title="Where Mark performs best" items={performanceImplications.performsBest} tone="strength" compact />
          <DomainListCard title="Where performance risk appears" items={performanceImplications.risk} tone="watchout" compact />
          <DomainListCard title="Recommended focus" items={performanceImplications.focus} tone="focus" compact />
        </div>
      </div>
    </Card>
  )
}

export function IndividualResultsWireframeContent() {
  return (
    <div className="pb-12 pt-4 sm:pt-6">
      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
        <Card className="overflow-hidden border-white/[0.08] bg-[linear-gradient(180deg,rgba(14,20,30,0.98),rgba(10,15,24,0.96))] px-6 py-6 sm:px-8 sm:py-7">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2.5">
                <WireframeBadge tone="accent">Prompt 1 wireframe</WireframeBadge>
                <WireframeBadge tone="muted">Static mock data</WireframeBadge>
                <WireframeBadge tone="muted">Multi-assessment model</WireframeBadge>
              </div>
              <div className="space-y-2">
                <h1 className="text-3xl font-semibold tracking-tight text-textPrimary md:text-4xl">Sonartra Signals — Individual Results</h1>
                <p className="max-w-3xl text-sm leading-6 text-textSecondary">
                  A scan-first prototype for the redesigned Individual Results experience. This pass focuses on layout, hierarchy, and decision-support clarity rather than live interpretation wiring.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button href="/individual/results" variant="secondary">
                View current live page
              </Button>
              <Button href="/dashboard" variant="ghost">
                Back to dashboard
              </Button>
            </div>
          </div>
        </Card>

        <div className="space-y-5">
          {assessments.map((assessment) => (
            <Card
              key={`${assessment.name}-${assessment.version}-${assessment.completedOn}`}
              className={assessment.expanded ? 'border-accent/15 bg-panel/[0.9]' : 'bg-panel/[0.78]'}
            >
              <AssessmentHeader assessment={assessment} />

                {assessment.expanded ? (
                  <div className="mt-6 space-y-7 border-t border-white/[0.06] pt-6 sm:space-y-8 sm:pt-7">
                    <HowToUseReportSection />
                    <ArchetypeOverviewSection />
                    {domainSections.map((section) => (
                      <DomainSection key={section.title} section={section} />
                    ))}
                    <div className="pt-3 sm:pt-4">
                      <PerformanceImplicationsSection />
                    </div>
                  </div>
              ) : null}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export function IndividualResultsWireframe() {
  return (
    <AppShell>
      <IndividualResultsWireframeContent />
    </AppShell>
  )
}
