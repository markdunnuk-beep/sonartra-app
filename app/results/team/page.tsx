import { RadarSummaryChart } from '@/components/charts/RadarSummaryChart'
import { AppShell } from '@/components/layout/AppShell'
import {
  CrossLayerInsightPanel,
  InsightCard,
  InterpretationPanel,
  LeadershipBalancePanel,
  RecommendationBlock,
  ResultsHero,
  ResultsSectionBlock,
  ResultsWorkspaceShell,
  SignalComparisonGrid,
  SignalDistributionBar,
  SignalRankList,
  SignalVarianceIndicator,
  TeamCompatibilityMatrix,
  TraitScoreCard,
} from '@/components/results/ResultsPrimitives'
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/motion/Reveal'
import { organisationSignalAverages, teamResults } from '@/data/mockData'
import { calculateSignalAverage, calculateSignalRange, calculateSignalVariance } from '@/lib/results/signalAggregation'



const teamCompatibilityRows = [
  {
    pairing: 'Strategist + Operator',
    primaryStyle: 'Strategic direction paired with delivery discipline',
    leadershipPattern: 'Decision architecture with execution acceleration',
    compatibility: 'High',
    frictionPoint: 'May compress exploration windows during rapid delivery cycles.',
  },
  {
    pairing: 'Catalyst + Integrator',
    primaryStyle: 'Innovation generation with relational stabilisation',
    leadershipPattern: 'Adaptive mobilisation with cohesion guardrails',
    compatibility: 'High',
    frictionPoint: 'Integrator bandwidth can become overloaded in parallel initiatives.',
  },
  {
    pairing: 'Operator + Operator',
    primaryStyle: 'Execution-heavy environment',
    leadershipPattern: 'Delivery intensity and accountability reinforcement',
    compatibility: 'Moderate',
    frictionPoint: 'Risk of under-indexing on long-horizon strategic recalibration.',
  },
  {
    pairing: 'Catalyst Cluster',
    primaryStyle: 'High ideation density across adjacent roles',
    leadershipPattern: 'Fast experimentation with fluid ownership boundaries',
    compatibility: 'Variable',
    frictionPoint: 'Volatility risk rises without Integrator-led sequencing controls.',
  },
]

const teamLeadershipDistribution = [
  { archetype: 'Strategist' as const, share: 31, note: 'Strong strategic framing presence in planning and prioritisation.' },
  { archetype: 'Operator' as const, share: 34, note: 'Dominant execution signal sustaining delivery reliability.' },
  { archetype: 'Integrator' as const, share: 22, note: 'Coordination layer is healthy but concentrated in a small set of roles.' },
  { archetype: 'Catalyst' as const, share: 13, note: 'Catalyst representation remains limited in transformation pods.' },
]
const teamInterpretationModules = [
  {
    label: 'Team Dynamic Readout',
    content:
      'The pod shows a stable strategy-execution architecture with broad agreement on decision framing and moderate variation in conflict handling style.',
    emphasis: 'primary' as const,
  },
  {
    label: 'Execution Pattern',
    content:
      'Leadership and behaviour signals indicate consistent operating cadence, while stress and conflict signals suggest resilience improves when escalation pathways are explicit.',
    emphasis: 'supporting' as const,
  },
  {
    label: 'Coordination Risk',
    content:
      'Signal spread remains manageable but highlights a subset of members that shift to reactive execution under timeline compression.',
    emphasis: 'context' as const,
  },
]

export default function TeamResultsPage() {
  const organisationRadarByName = Object.fromEntries(organisationSignalAverages.map((signal) => [signal.name, signal.score]))
  const averageSignal = calculateSignalAverage(teamResults.radar)
  const range = calculateSignalRange(teamResults.radar)
  const variance = calculateSignalVariance(teamResults.radar)

  return (
    <AppShell>
      <ResultsWorkspaceShell
        title="Team Intelligence"
        subtitle="Aggregated behavioural intelligence for leadership review across team architecture, variation profile, and operational implications."
        statusLabel="Team Signals"
      >
        <Reveal as="section" y={14}>
          <ResultsHero
            dominant={teamResults.profile.dominant}
            secondary={teamResults.profile.secondary}
            summary={teamResults.profile.summary}
            standoutFinding="Leadership and Behaviour signals remain above organisational baseline with concentrated variation in conflict and stress dimensions."
            confidence="Moderate-High"
            dominantArchitecture="Strategist and Integrator patterns define the core team architecture, with Operator reinforcement sustaining delivery cadence."
            keySignalPattern="Primary concentration is in Leadership and Behaviour, while Conflict and Stress show the widest internal spread."
            operationalImplication="Maintain explicit decision and escalation pathways to preserve velocity as workload intensity increases."
          />
        </Reveal>

        <Reveal as="section" y={16}>
          <ResultsSectionBlock
            title="Team Behavioural Overview"
            description="Average behavioural signal posture and ranked concentration across the current assessed cohort."
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <RevealGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" staggerChildren={0.08}>
                {teamResults.radar.map((item) => (
                  <RevealItem key={item.name}>
                    <TraitScoreCard name={item.name} score={item.score} detail={`Team average — ${item.score}`} />
                  </RevealItem>
                ))}
              </RevealGroup>
              <SignalRankList
                title="Signal Concentration Ranking"
                items={teamResults.radar.map((signal) => ({
                  label: signal.name,
                  score: signal.score,
                }))}
              />
            </div>
          </ResultsSectionBlock>
        </Reveal>

        <Reveal as="section" y={16}>
          <ResultsSectionBlock
            title="Signal Distribution"
            description="Observed spread within the team to identify concentration, variability, and potential volatility signals."
          >
            <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="space-y-4 rounded-2xl border border-border/70 bg-panel/55 p-4">
                {teamResults.distribution.map((distributionItem) => (
                  <SignalDistributionBar
                    key={distributionItem.label}
                    label={distributionItem.label}
                    min={distributionItem.min}
                    max={distributionItem.max}
                    value={distributionItem.value}
                    benchmark={organisationRadarByName[distributionItem.label]}
                  />
                ))}
              </div>
              <div className="space-y-4">
                <InsightCard title="Average Team Signal" detail={`${averageSignal} / 100 across measured dimensions.`} emphasized compact />
                <InsightCard title="Signal Range" detail={`${range.min} to ${range.max} across team architecture.`} compact />
                <SignalVarianceIndicator
                  score={variance}
                  insight="Stress variance is elevated across sub-teams, indicating potential operational instability under pressure."
                />
              </div>
            </div>
          </ResultsSectionBlock>
        </Reveal>


        <Reveal as="section" y={16}>
          <ResultsSectionBlock
            title="Compatibility Intelligence"
            description="Behavioural style pairings and leadership patterns indicating acceleration opportunities and friction risks."
          >
            <TeamCompatibilityMatrix rows={teamCompatibilityRows} />
          </ResultsSectionBlock>
        </Reveal>

        <Reveal as="section" y={16}>
          <ResultsSectionBlock
            title="Leadership Architecture Balance"
            description="Distribution across Strategist, Operator, Integrator, and Catalyst archetypes for deployment planning."
          >
            <LeadershipBalancePanel distribution={teamLeadershipDistribution} />
          </ResultsSectionBlock>
        </Reveal>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Reveal as="section" y={16}>
            <ResultsSectionBlock
              title="Team Behavioural Architecture"
              description="Structural representation of signal balance across core behavioural dimensions."
            >
              <div className="space-y-4">
                <div className="rounded-2xl border border-accent/20 bg-panel/65 p-2 sm:p-3">
                  <RadarSummaryChart data={teamResults.radar} />
                </div>
                <SignalComparisonGrid
                  title="Team vs Organisation Context"
                  description="Relative signal deltas are presented for fast executive interpretation."
                  rows={teamResults.radar.map((signal) => ({
                    signal: signal.name,
                    subjectLabel: 'Team',
                    subjectScore: signal.score,
                    comparisons: [
                      {
                        label: 'organisation',
                        score: organisationRadarByName[signal.name] ?? signal.score,
                        percentileLabel: signal.score >= 78 ? 'Top 20% signal' : undefined,
                      },
                    ],
                  }))}
                />
              </div>
            </ResultsSectionBlock>
          </Reveal>

          <Reveal as="section" y={16}>
            <ResultsSectionBlock
              title="Team Insights"
              description="Interpretation modules translating measured architecture into team dynamic insights."
            >
              <div className="space-y-4">
                {teamInterpretationModules.map((module) => (
                  <InterpretationPanel
                    key={module.label}
                    label={module.label}
                    content={module.content}
                    emphasis={module.emphasis}
                  />
                ))}
              </div>
            </ResultsSectionBlock>
          </Reveal>
        </div>

        <Reveal as="section" y={16}>
          <ResultsSectionBlock
            title="Team Operational Implications"
            description="Strategic operating guidance structured for operating environments, deployment, composition, and governance."
          >
            <div className="space-y-4">
              <CrossLayerInsightPanel
                insights={[
                  {
                    title: 'Individual vs Team',
                    observation: 'Individual leadership signals exceed team baseline, but conflict adaptation remains uneven across members.',
                    implication: 'Leadership strength is concentrated in specific contributors and should be distributed through mentoring structures.',
                  },
                  {
                    title: 'Team vs Organisation',
                    observation: 'Team leadership signal exceeds organisational baseline while stress sits above enterprise median.',
                    implication: 'This pod can anchor execution-critical initiatives with explicit resilience support.',
                  },
                  {
                    title: 'Variance + Leadership Distribution',
                    observation: 'Clustered variance combined with Operator dominance indicates reliable throughput with constrained innovation bandwidth.',
                    implication: 'Increase Catalyst coverage without diluting Integrator governance capacity.',
                  },
                ]}
              />
              <RecommendationBlock
                title="Strategic Operating Guidance"
                categories={[
                  {
                    category: 'Operating environments',
                    items: ['High accountability execution phases', 'Structured delivery programmes with explicit interlock cadence'],
                  },
                  {
                    category: 'Leadership deployment',
                    items: [
                      {
                        label: 'Decision architecture roles',
                        detail: 'Position Strategist profiles in decision architecture roles to maintain clarity under complexity.',
                      },
                      {
                        label: 'Delivery functions',
                        detail: 'Reinforce Integrator coverage in delivery functions where dependency load is highest.',
                      },
                    ],
                  },
                  {
                    category: 'Team composition adjustments',
                    items: [
                      'Add selective Catalyst representation to transformation streams to expand adaptive capacity.',
                      'Avoid over-clustering Operators in innovation-stage squads.',
                    ],
                  },
                  {
                    category: 'Governance recommendations',
                    items: ['Tighten escalation pathways', 'Introduce cross-unit decision cadence with explicit ownership handoffs'],
                  },
                ]}
                items={[]}
                ctaLabel="Download Team Intelligence Brief"
              />
            </div>
          </ResultsSectionBlock>
        </Reveal>
      </ResultsWorkspaceShell>
    </AppShell>
  )
}
