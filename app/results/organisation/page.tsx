import { AppShell } from '@/components/layout/AppShell'
import {
  CrossLayerInsightPanel,
  InsightCard,
  InterpretationPanel,
  LeadershipBalancePanel,
  RecommendationBlock,
  RiskSignalPanel,
  ResultsHero,
  ResultsSectionBlock,
  SignalComparisonGrid,
  SignalDistributionBar,
  SignalRankList,
  SignalVarianceIndicator,
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



const organisationLeadershipDistribution = [
  { archetype: 'Strategist' as const, share: 24, note: 'Strategic guidance is present but concentrated in senior layers.' },
  { archetype: 'Operator' as const, share: 44, note: 'Operator leadership is dominant across execution-critical functions.' },
  { archetype: 'Integrator' as const, share: 20, note: 'Integrator coverage supports core coordination but is thin in frontier units.' },
  { archetype: 'Catalyst' as const, share: 12, note: 'Catalyst leadership is underrepresented in transformation portfolios.' },
]

const organisationRiskSignals = [
  { category: 'Execution Risk', signal: 'Moderate' as const, rationale: 'Low Integrator coverage in two scaling functions increases handoff friction.' },
  { category: 'Alignment Risk', signal: 'Elevated' as const, rationale: 'High cultural variance across growth units indicates alignment drift risk.' },
  { category: 'Escalation Risk', signal: 'Elevated' as const, rationale: 'Conflict and stress clustering in interdependent programmes may amplify escalation loops.' },
  { category: 'Volatility Risk', signal: 'Moderate' as const, rationale: 'Wide behavioural spread in critical functions can produce uneven delivery reliability.' },
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
              <SignalVarianceIndicator
                score={variance}
                insight="Stress variance remains high across teams, signalling potential operational instability under sustained pressure."
              />
            </div>
          </div>
        </ResultsSectionBlock>

        <ResultsSectionBlock title="Signal Concentration" description="Distribution bars show where enterprise behavioural strength and concentration currently cluster.">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
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
            <LeadershipBalancePanel distribution={organisationLeadershipDistribution} />
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
          <div className="space-y-4">
            <SignalComparisonGrid
              title="Organisation vs Team"
              rows={organisationSignalAverages.map((signal) => ({
                signal: signal.name,
                subjectLabel: 'Organisation',
                subjectScore: signal.score,
                comparisons: [{ label: 'team', score: teamRadarByName[signal.name] ?? signal.score }],
              }))}
            />
            <CrossLayerInsightPanel
              insights={[
                {
                  title: 'Team vs Organisation Leadership',
                  observation: 'Team leadership signal exceeds organisational baseline but variance indicates uneven capability distribution.',
                  implication: 'Leadership strength is concentrated in specific units and requires broader deployment design.',
                },
                {
                  title: 'Variance Synthesis',
                  observation: 'Enterprise variance remains clustered with stress and conflict dimensions carrying the widest spread.',
                  implication: 'Governance and escalation architecture should be tightened before additional scale phases.',
                },
                {
                  title: 'Distribution Synthesis',
                  observation: 'Operator dominance and Catalyst scarcity create a reliable but less adaptive leadership architecture.',
                  implication: 'Transformation initiatives will benefit from targeted Catalyst injections with Integrator safeguards.',
                },
              ]}
            />
          </div>
        </ResultsSectionBlock>

        <ResultsSectionBlock title="Team Intelligence Matrix" description="Member-level signal spread across style, leadership architecture, and risk alignment.">
          <TeamMatrix members={organisationResults.members} />
        </ResultsSectionBlock>

        <ResultsSectionBlock title="Interpretive Briefing" description="Critical implications grouped for faster executive reading.">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <InsightCard title="Leadership Distribution" detail="Operator leadership dominant at 44% of assessed population." />
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
            <RiskSignalPanel risks={organisationRiskSignals} />
          </div>
        </ResultsSectionBlock>

        <ResultsSectionBlock
          title="Strategic Implications"
          description="Operating model recommendations aligned to enterprise signal architecture."
        >
          <RecommendationBlock
            title="Organisation Operating Model Recommendations"
            categories={[
              {
                category: 'Operating environments',
                items: ['High accountability execution phases', 'Structured delivery programmes with explicit ownership boundaries'],
              },
              {
                category: 'Leadership deployment',
                items: [
                  {
                    label: 'Decision architecture',
                    detail: 'Position Strategist profiles in enterprise decision architecture roles across critical functions.',
                  },
                  {
                    label: 'Delivery reinforcement',
                    detail: 'Reinforce Integrator coverage in delivery functions with high dependency density.',
                  },
                ],
              },
              {
                category: 'Team composition adjustments',
                items: [
                  'Increase Catalyst representation in transformation initiatives to expand innovation throughput.',
                  'Avoid over-concentration of Operator profiles in exploratory programmes.',
                ],
              },
              {
                category: 'Governance recommendations',
                items: ['Tighten escalation pathways', 'Introduce cross-unit decision cadence and standardised risk checkpoints'],
              },
            ]}
            items={[]}
            ctaLabel="Download Organisation Intelligence Brief"
          />
        </ResultsSectionBlock>
      </ResultsWorkspaceShell>
    </AppShell>
  )
}
