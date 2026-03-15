import { AppShell } from '@/components/layout/AppShell'
import {
  InsightCard,
  ResultsSectionBlock,
  ResultsWorkspaceShell,
  SignalChip,
  TraitScoreCard,
} from '@/components/results/ResultsPrimitives'
import { TeamMatrix } from '@/components/sections/TeamMatrix'
import { StatCard } from '@/components/ui/StatCard'
import { organisationResults } from '@/data/mockData'

export default function OrganisationResultsPage() {
  return (
    <AppShell>
      <ResultsWorkspaceShell
        title="Organisation Intelligence"
        subtitle="Team-level behavioural intelligence summary with leadership balance, alignment, and risk concentration indicators."
        statusLabel="Organisation Signals"
      >
        <ResultsSectionBlock title="Executive Snapshot" description="Top-line metrics establish current enterprise behavioural posture.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {organisationResults.stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </ResultsSectionBlock>

        <ResultsSectionBlock title="Team Intelligence Matrix" description="Member-level signal spread across style, leadership architecture, and risk alignment.">
          <TeamMatrix members={organisationResults.members} />
        </ResultsSectionBlock>

        <ResultsSectionBlock title="Interpretive Briefing" description="Critical implications grouped for faster executive reading.">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InsightCard title="Leadership Distribution" detail="Operator profiles dominate 44% of assessed population." />
            <InsightCard
              title="Cultural Alignment"
              detail="Highest alignment appears in Product and Operations with emerging tension in GTM pods."
            />
            <InsightCard
              title="Risk Indicators"
              detail="Escalation risk is concentrated in two high-interdependency functions requiring clearer escalation pathways."
            />
            <InsightCard
              title="Matrix Signal"
              detail="Strategist and Integrator blend remains healthy while Catalyst representation is below target composition."
            />
          </div>
        </ResultsSectionBlock>

        <ResultsSectionBlock title="Signal Anchors" description="Reusable trait meter foundation for future team-wide score visualisations.">
          <div className="grid gap-4 md:grid-cols-3">
            <TraitScoreCard name="Behaviour Balance" score={72} detail="Team behaviour balance score" />
            <TraitScoreCard name="Culture Risk" score={64} detail="Lower indicates greater instability risk" />
            <div className="surface space-y-3 p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Readout State</p>
              <p className="text-sm text-textSecondary">Deeper organisational narrative and export formatting will extend from this foundation in Pass 2.</p>
              <SignalChip tone="accent">Pass 1 Foundation Ready</SignalChip>
            </div>
          </div>
        </ResultsSectionBlock>
      </ResultsWorkspaceShell>
    </AppShell>
  )
}
