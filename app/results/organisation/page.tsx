import { AppShell } from '@/components/layout/AppShell'
import {
  InsightCard,
  InterpretationPanel,
  RecommendationBlock,
  ResultsHero,
  ResultsSectionBlock,
  SignalComparisonGrid,
  SignalDistributionBar,
  SignalRankList,
  ResultsWorkspaceShell,
} from '@/components/results/ResultsPrimitives'
import { TeamMatrix } from '@/components/sections/TeamMatrix'
import { StatCard } from '@/components/ui/StatCard'
import { organisationResults, organisationSignalAverages, teamResults } from '@/data/mockData'
import { calculateSignalAverage, calculateSignalRange, calculateSignalVariance } from '@/lib/results/signalAggregation'

const organisationDistribution = [
  { label: 'Behaviour', min: 54, max: 91, value: 73 },
  { label: 'Leadership', min: 48, max: 89, value: 74 },
  { label: 'Culture', min: 52, max: 86, value: 71 },
  { label: 'Stress', min: 41, max: 82, value: 64 },
]

export default function OrganisationResultsPage() {
  const teamRadarByName = Object.fromEntries(teamResults.radar.map((signal) => [signal.name, signal.score]))
  const averageSignal = calculateSignalAverage(organisationSignalAverages)
  const range = calculateSignalRange(organisationSignalAverages)
  const variance = calculateSignalVariance(organisationSignalAverages)

  return (
    <AppShell>
      <ResultsWorkspaceShell
        title="Organisation Intelligence"
        subtitle="Enterprise behavioural intelligence layer summarising dominant architecture, concentration patterns, and strategic operating implications."
        statusLabel="Organisation Signals"
      >
        <ResultsHero
          dominant="Operator-Strategist Enterprise Mix"
          secondary="Integrator Stabilisation Layer"
          summary="Organisation-wide signal posture indicates stable execution architecture with emerging concentration risks in conflict handling and stress resilience in high interdependency functions."
          standoutFinding="Leadership and behaviour signals remain structurally strong while conflict and stress concentration indicate targeted operating model pressure points."
          confidence="Moderate"
          dominantArchitecture="Dominant organisational architecture is anchored in Operator and Strategist signatures, reinforced by Integrator distribution in core delivery units."
          keySignalPattern="Signal concentration is highest in Leadership and Behaviour, with measurable spread in Conflict and Stress dimensions across teams."
          operationalImplication="Prioritise escalation protocol standardisation and decision-right clarity in interdependent programmes to protect enterprise execution velocity."
        />

        <ResultsSectionBlock title="Organisation Behavioural Snapshot" description="Top-line metrics establish current enterprise behavioural posture.">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {organisationResults.stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </ResultsSectionBlock>

        <ResultsSectionBlock
          title="Dominant Signal Architecture"
          description="Ranked organisational signal strengths with compact enterprise-level concentration summary."
        >
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <SignalRankList
              title="Organisation Signal Ranking"
              items={organisationSignalAverages.map((signal) => ({
                label: signal.name,
                score: signal.score,
              }))}
            />
            <div className="grid gap-4">
              <InsightCard title="Average Signal" detail={`${averageSignal} / 100`}
              />
              <InsightCard title="Signal Range" detail={`${range.min} to ${range.max}`} />
              <InsightCard title="Signal Variance" detail={`${variance} variance points across aggregate architecture.`} />
            </div>
          </div>
        </ResultsSectionBlock>

        <ResultsSectionBlock title="Signal Concentration" description="Distribution bars show where enterprise behavioural strength and concentration currently cluster.">
          <div className="rounded-2xl border border-border/70 bg-panel/55 p-4 space-y-4">
            {organisationDistribution.map((distributionItem) => (
              <SignalDistributionBar
                key={distributionItem.label}
                label={distributionItem.label}
                min={distributionItem.min}
                max={distributionItem.max}
                value={distributionItem.value}
                benchmark={teamRadarByName[distributionItem.label]}
              />
            ))}
          </div>
        </ResultsSectionBlock>

        <ResultsSectionBlock
          title="Organisational Dynamics"
          description="High-level interpretation modules translating aggregate signal posture into strategic dynamics."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <InterpretationPanel
              label="Execution Dynamic"
              content="Execution reliability remains high where Integrator patterns are embedded, though cross-unit handoffs require tighter decision governance."
              emphasis="primary"
            />
            <InterpretationPanel
              label="Cultural Dynamic"
              content="Cultural cohesion remains stable in core delivery units, with emerging friction in rapidly scaling interface teams."
              emphasis="supporting"
            />
            <InterpretationPanel
              label="Risk Dynamic"
              content="Conflict and stress concentration indicates elevated escalation risk in multi-team initiatives with ambiguous ownership boundaries."
              emphasis="supporting"
            />
            <InterpretationPanel
              label="Capability Dynamic"
              content="Catalyst signal representation is below target in innovation-heavy streams, reducing adaptive capacity during change cycles."
              emphasis="context"
            />
          </div>
        </ResultsSectionBlock>

        <ResultsSectionBlock
          title="Cross-Layer Comparison"
          description="Organisation and team level comparisons provide a baseline for future multi-entity analytics."
        >
          <SignalComparisonGrid
            title="Organisation vs Team"
            rows={organisationSignalAverages.map((signal) => ({
              signal: signal.name,
              subjectLabel: 'Organisation',
              subjectScore: signal.score,
              comparisons: [{ label: 'team', score: teamRadarByName[signal.name] ?? signal.score }],
            }))}
          />
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

        <ResultsSectionBlock
          title="Strategic Implications"
          description="Operating model recommendations aligned to enterprise signal architecture."
        >
          <RecommendationBlock
            title="Organisation Operating Model Recommendations"
            items={[
              {
                label: 'Escalation Framework',
                detail: 'Standardise escalation pathways across high interdependency functions to reduce conflict volatility and decision latency.',
              },
              {
                label: 'Leadership Portfolio Balance',
                detail: 'Increase Catalyst-profile deployment in innovation streams while preserving Integrator coverage in execution-critical units.',
              },
              {
                label: 'Governance Cadence',
                detail: 'Implement tighter cross-unit decision checkpoints to sustain strategic alignment during rapid operating model shifts.',
              },
            ]}
            ctaLabel="Download Organisation Intelligence Brief"
          />
        </ResultsSectionBlock>
      </ResultsWorkspaceShell>
    </AppShell>
  )
}
