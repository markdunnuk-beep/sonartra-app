import { RadarSummaryChart } from '@/components/charts/RadarSummaryChart'
import { AppShell } from '@/components/layout/AppShell'
import {
  InsightCard,
  InterpretationPanel,
  RecommendationBlock,
  ResultsHero,
  ResultsSectionBlock,
  ResultsWorkspaceShell,
  SignalComparisonGrid,
  TraitScoreCard,
} from '@/components/results/ResultsPrimitives'
import { Reveal, RevealGroup, RevealItem } from '@/components/ui/motion/Reveal'
import { BarList } from '@/components/ui/BarList'
import { individualResults, organisationSignalAverages, teamResults } from '@/data/mockData'

const interpretationModules = [
  {
    label: 'Leadership Interpretation',
    content:
      'Leadership signal shows high directive precision and strategic structuring strength. This profile sets pace effectively when operating mandates are explicit and ownership lines are enforced.',
    emphasis: 'primary' as const,
  },
  {
    label: 'Conflict Interpretation',
    content:
      'Conflict posture is structured and direct. Resolution quality rises when disagreements are translated into objective trade-offs tied to delivery metrics and decision timelines.',
    emphasis: 'supporting' as const,
  },
  {
    label: 'Culture Interpretation',
    content:
      'Cultural fit improves in systems that reward operational clarity, transparent standards, and visible cross-functional priorities rather than informal consensus loops.',
    emphasis: 'supporting' as const,
  },
  {
    label: 'Stress Interpretation',
    content:
      'Stress drag is most likely under prolonged ambiguity. Governance cadence, scoped decision rights, and sharper sequencing materially reduce performance volatility.',
    emphasis: 'context' as const,
  },
]

const signalDescriptors: Record<string, string> = {
  Behaviour: 'Strategic pattern recognition strength',
  Leadership: 'Execution architecture and accountability discipline',
  Culture: 'System alignment and cohesion signal',
  Conflict: 'Structured resolution capability',
  Motivation: 'Sustained internal drive consistency',
}

function signalStrengthLabel(score: number) {
  if (score >= 82) return 'High Priority Signal'
  if (score >= 70) return 'Core Supporting Signal'
  return 'Contextual Signal'
}

export default function IndividualResultsPage() {
  const teamRadarByName = Object.fromEntries(teamResults.radar.map((signal) => [signal.name, signal.score]))
  const orgRadarByName = Object.fromEntries(organisationSignalAverages.map((signal) => [signal.name, signal.score]))

  return (
    <AppShell>
      <ResultsWorkspaceShell
        title="Individual Results"
        subtitle="Executive behavioural intelligence briefing for Sonartra Signals. Review the dominant behavioural architecture, supporting dimensions, and recommended operating actions."
      >
        <Reveal as="section" y={14}>
          <ResultsHero
            dominant={individualResults.profile.dominant}
            secondary={individualResults.profile.secondary}
            summary={individualResults.profile.summary}
            standoutFinding="Execution discipline and strategic pattern recognition are materially above baseline, with the highest signal concentration in Behaviour and Leadership dimensions."
            confidence="High"
            dominantArchitecture="Behaviour and Leadership operate as the dominant architecture, producing a profile that privileges structured judgement, clear accountability lines, and deliberate decision sequencing."
            keySignalPattern="Top signal concentration sits in Behaviour, followed by Leadership and Culture, indicating high leverage in environments requiring strategic interpretation with disciplined execution follow-through."
            operationalImplication="Deploy in transformation mandates where ambiguity must be reduced into measurable execution pathways, while maintaining governance cadence to protect performance under sustained pressure."
          />
        </Reveal>

        <Reveal as="section" y={16}>
          <ResultsSectionBlock
            title="Behavioural Signal Overview"
            description="Top-line dimensions are structured to separate dominant signal strength from supporting behavioural detail."
          >
            <RevealGroup className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" staggerChildren={0.08}>
              {individualResults.radar.map((item) => (
                <RevealItem key={item.name}>
                  <TraitScoreCard
                    name={item.name}
                    score={item.score}
                    detail={`Signal score — ${item.score}`}
                    descriptor={signalDescriptors[item.name] ?? 'Behavioural intelligence indicator'}
                    strengthLabel={signalStrengthLabel(item.score)}
                    comparisonRows={
                      teamRadarByName[item.name] !== undefined && orgRadarByName[item.name] !== undefined
                        ? [
                            { label: 'Team Avg', value: teamRadarByName[item.name] },
                            { label: 'Organisation Avg', value: orgRadarByName[item.name] },
                          ]
                        : undefined
                    }
                  />
                </RevealItem>
              ))}
            </RevealGroup>
          </ResultsSectionBlock>
        </Reveal>

        <Reveal as="section" y={16}>
          <ResultsSectionBlock
            title="Cross-Entity Comparison Context"
            description="Lightweight benchmarking against current team and organisation averages for each measured signal."
          >
            <SignalComparisonGrid
              title="Individual vs Team vs Organisation"
              rows={individualResults.radar.map((signal) => ({
                signal: signal.name,
                subjectLabel: 'Individual',
                subjectScore: signal.score,
                comparisons: [
                  { label: 'team', score: teamRadarByName[signal.name] ?? signal.score },
                  { label: 'organisation', score: orgRadarByName[signal.name] ?? signal.score },
                ],
              }))}
            />
          </ResultsSectionBlock>
        </Reveal>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Reveal as="section" y={16}>
            <ResultsSectionBlock
              title="Primary Intelligence"
              description="Core behavioural architecture and motivator distribution provide the main explanatory layer for this profile."
            >
              <div className="space-y-4">
                <InsightCard
                  title="Behaviour Architecture"
                  detail="Aggregated axis view clarifies where high-confidence behavioural concentration is strongest and where adjacent operating conditions require reinforcement."
                />
                <div className="rounded-2xl border border-accent/20 bg-panel/65 p-2 sm:p-3">
                  <RadarSummaryChart data={individualResults.radar} />
                </div>
                <InsightCard
                  title="Motivational Drivers"
                  detail="Driver distribution indicates where sustained execution energy is naturally reinforced and where incentive architecture should be intentionally designed."
                />
                <div className="rounded-xl border border-border/75 bg-bg/35 p-3">
                  <BarList items={individualResults.motivators} />
                </div>
              </div>
            </ResultsSectionBlock>
          </Reveal>

          <Reveal as="section" y={16}>
            <ResultsSectionBlock
              title="Interpretation Modules"
              description="Translation of measured outputs into operating implications, ordered from primary readout to contextual risk framing."
            >
              <div className="space-y-4">
                {interpretationModules.map((module) => (
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
            title="Action and Next Step"
            description="Prioritised recommendations to apply profile intelligence in execution contexts."
          >
            <RecommendationBlock
              title="Operating Conditions and Leadership Application"
              items={[
                {
                  label: 'Recommended Operating Environments',
                  detail:
                    'Strategic build phases with high accountability, explicit ownership boundaries, and measurable programme checkpoints.',
                },
                {
                  label: 'Leadership Considerations',
                  detail:
                    'Anchor this profile in roles requiring directive clarity and sequencing discipline; pair with integrator profiles to widen adaptive bandwidth.',
                },
                {
                  label: 'Execution Conditions',
                  detail:
                    'Maintain transparent decision-right frameworks, short review cadence, and high visibility into cross-functional dependencies.',
                },
                {
                  label: 'Risk Watch-Outs',
                  detail:
                    'Monitor for drag during extended ambiguity windows; intervene early with tighter scope control and explicit decision escalation channels.',
                },
              ]}
              ctaLabel="Download Board-Ready Report"
            />
          </ResultsSectionBlock>
        </Reveal>
      </ResultsWorkspaceShell>
    </AppShell>
  )
}
