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
    summary: 'Analyst–Driver profile with high structure, autonomy, and outcome focus.',
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
    'Mark tends to operate as an Analyst–Driver — structured, evidence-led, and focused on progress without losing control.',
  strengths: [
    'Brings rigour to decisions without stalling momentum.',
    'Maintains high standards under delivery pressure.',
    'Creates clarity when work or ownership is ambiguous.',
  ],
  watchouts: [
    'Can move into bluntness when pace overtakes alignment.',
    'May under-signal support while raising performance expectations.',
    'Can narrow consultation once a path feels evidence-backed.',
  ],
  focus: [
    'Invite faster dissent before locking direction.',
    'Balance speed targets with visible stakeholder alignment.',
    'Make trade-offs explicit when standards remain high.',
  ],
}

const domainSections: DomainSectionModel[] = [
  {
    title: 'Behaviour Style',
    primaryProfile: 'Primary profile: Analyst–Driver',
    description: 'Mark is structured, data-driven, and outcome-focused, with a clear preference for accuracy before acceleration.',
    strengths: ['Makes decisions with evidence and control.', 'Translates complexity into clear next steps.', 'Holds quality without losing delivery focus.'],
    watchouts: ['Can over-index on proof before social alignment.', 'May sound abrupt when urgency is high.', 'Can underestimate the need for context-setting.'],
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
    description: 'Mark is energised by difficult problems, room to think independently, and environments where standards are visible.',
    strengths: ['Responds well to stretch with clear ownership.', 'Invests deeply when outcomes feel measurable.', 'Builds energy through competence and progress.'],
    watchouts: ['Disengages if work feels vague or politicised.', 'Can lose patience with low-rigour decision making.', 'May resist unnecessary oversight.'],
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
    strengths: ['Clarifies direction when teams need structure.', 'Raises quality through explicit expectations.', 'Stays composed while making difficult calls.'],
    watchouts: ['Can underplay encouragement while correcting course.', 'May assume others are comfortable with low-context direction.', 'Can become overly task-heavy in high-pressure periods.'],
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
    strengths: ['Addresses issues early when standards slip.', 'Separates signal from emotion in difficult conversations.', 'Prefers clean resolution over prolonged friction.'],
    watchouts: ['Can move too quickly to the answer.', 'May miss unspoken resistance in quieter stakeholders.', 'Can sound more final than intended.'],
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
    description: 'Mark works best where expectations are explicit, accountability is shared, and decisions follow a credible logic.',
    strengths: ['Thrives in clear, performance-oriented teams.', 'Adds structure in ambiguous operating environments.', 'Supports cultures that reward substance over noise.'],
    watchouts: ['Can find highly consensus-driven settings slow.', 'May withdraw in environments with unclear ownership.', 'Can be sceptical of symbolic culture activity.'],
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
    description: 'Under pressure, Mark typically becomes more exacting, more concise, and more focused on control of outcomes.',
    strengths: ['Maintains standards when complexity rises.', 'Stays operationally useful in tense moments.', 'Can stabilise teams through calm prioritisation.'],
    watchouts: ['May reduce empathy signalling when overloaded.', 'Can tighten control instead of sharing constraints.', 'May overfunction rather than redistribute load.'],
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
    'Roles with clear decision rights, high autonomy, and visible standards.',
    'Complex delivery environments where analytical rigour improves execution quality.',
    'Leadership contexts that reward precision, accountability, and pace discipline.',
  ],
  risk: [
    'Cross-functional work where alignment needs more airtime than Mark naturally gives it.',
    'High-change periods where pressure can narrow consultation and tone.',
    'Teams that require visible encouragement before they will challenge back.',
  ],
  focus: [
    'Signal rationale early so stakeholders can engage before decisions harden.',
    'Use concise check-ins to test for understanding, not just agreement.',
    'Delegate pressure transparently instead of absorbing it through tighter control.',
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
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium text-textPrimary/92">{label}</span>
        <span className="text-textSecondary">{value}%</span>
      </div>
      <div className="h-2.5 overflow-hidden rounded-full bg-[#101926] ring-1 ring-white/[0.04]">
        <div
          className="h-full rounded-full bg-gradient-to-r from-[#56739A] via-[#7098C6] to-[#9CC4F4]"
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function DomainListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-[1.125rem] border border-white/[0.07] bg-white/[0.03] p-4 sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#96AECB]">{title}</p>
      <ul className="mt-3 space-y-2.5 text-sm leading-6 text-textSecondary">
        {items.map((item) => (
          <li key={item} className="flex gap-2.5">
            <span className="mt-2 h-1.5 w-1.5 rounded-full bg-accent/80" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DomainSection({ section }: { section: DomainSectionModel }) {
  return (
    <Card className="border-white/[0.08] bg-panel/[0.88] px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-5">
        <div className="space-y-3 border-b border-white/[0.06] pb-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">{section.title}</p>
              <h3 className="text-lg font-semibold tracking-tight text-textPrimary">{section.primaryProfile}</h3>
            </div>
            <WireframeBadge tone="muted">Distribution + guidance</WireframeBadge>
          </div>
          <p className="max-w-3xl text-sm leading-6 text-textSecondary">{section.description}</p>
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)]">
          <div className="rounded-[1.25rem] border border-white/[0.07] bg-bg/55 p-4 sm:p-5">
            <div className="space-y-3.5">
              {section.bars.map((bar) => (
                <DistributionBar key={bar.label} {...bar} />
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
            <DomainListCard title="Strengths" items={section.strengths} />
            <DomainListCard title="Watchouts" items={section.watchouts} />
          </div>
        </div>
      </div>
    </Card>
  )
}

function ArchetypeOverviewSection() {
  return (
    <Card className="border-accent/12 bg-[linear-gradient(180deg,rgba(20,31,47,0.96),rgba(13,19,29,0.94))] px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">Sonartra Archetype Overview</p>
            <div className="flex flex-wrap gap-3">
              {[archetypeCards.primary, archetypeCards.secondary].map((item) => (
                <div
                  key={item.label}
                  className="flex min-w-[180px] items-center gap-3 rounded-[1.125rem] border border-white/[0.08] bg-white/[0.03] px-4 py-3"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-accent/25 bg-accent/10 text-sm font-semibold text-[#D5E8FF]">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{item.note}</p>
                    <p className="text-sm font-semibold text-textPrimary">{item.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="max-w-md rounded-[1.125rem] border border-white/[0.08] bg-bg/55 px-4 py-3.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8FA6C5]">Quick read</p>
            <p className="mt-2 text-sm leading-6 text-textSecondary">{archetypeCards.summary}</p>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DomainListCard title="Strengths" items={archetypeCards.strengths} />
          <DomainListCard title="Watchouts" items={archetypeCards.watchouts} />
          <DomainListCard title="Focus Areas" items={archetypeCards.focus} />
        </div>
      </div>
    </Card>
  )
}

function HowToUseReportSection() {
  return (
    <div className="rounded-[1.25rem] border border-white/[0.07] bg-[#0B111A]/90 px-5 py-4 sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">How to Use This Report</p>
          <p className="max-w-3xl text-sm leading-6 text-textSecondary">
            Sonartra Signals is the core behavioural assessment. Use the six domain readouts below to scan how Mark tends to operate, what energises him, how he leads, where friction appears, what culture fits best, and how pressure changes his pattern.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {['Behaviour Style', 'Motivators', 'Leadership', 'Conflict', 'Culture', 'Stress'].map((item) => (
            <div key={item} className="rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2 text-sm text-textPrimary/90">
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
    <Card className="border-white/[0.08] bg-panel/[0.9] px-5 py-5 sm:px-6 sm:py-6">
      <div className="space-y-5">
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#8FA6C5]">Performance Implications</p>
          <h3 className="text-xl font-semibold tracking-tight text-textPrimary">Operational guidance for where Mark is likely to add the most value.</h3>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <DomainListCard title="Where Mark performs best" items={performanceImplications.performsBest} />
          <DomainListCard title="Where performance risk appears" items={performanceImplications.risk} />
          <DomainListCard title="Recommended focus" items={performanceImplications.focus} />
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
                <Button href="/results/individual" variant="secondary">
                  View current live page
                </Button>
                <Button href="/dashboard" variant="ghost">
                  Back to dashboard
                </Button>
              </div>
            </div>
          </Card>

          <div className="space-y-4">
            {assessments.map((assessment) => (
              <Card
                key={`${assessment.name}-${assessment.version}-${assessment.completedOn}`}
                className={assessment.expanded ? 'border-accent/15 bg-panel/[0.9]' : 'bg-panel/[0.78]'}
              >
                <AssessmentHeader assessment={assessment} />

                {assessment.expanded ? (
                  <div className="mt-6 space-y-5 border-t border-white/[0.06] pt-6 sm:space-y-6 sm:pt-7">
                    <HowToUseReportSection />
                    <ArchetypeOverviewSection />
                    {domainSections.map((section) => (
                      <DomainSection key={section.title} section={section} />
                    ))}
                    <PerformanceImplicationsSection />
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
