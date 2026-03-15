import { RadarSummaryChart } from '@/components/charts/RadarSummaryChart'
import { AppShell } from '@/components/layout/AppShell'
import {
  InsightCard,
  InterpretationPanel,
  RecommendationBlock,
  ResultsHero,
  ResultsSectionBlock,
  ResultsWorkspaceShell,
  TraitScoreCard,
} from '@/components/results/ResultsPrimitives'
import { BarList } from '@/components/ui/BarList'
import { individualResults } from '@/data/mockData'

const interpretationModules = [
  {
    label: 'Leadership Interpretation',
    content:
      'Operates as a precision-oriented strategic driver. Highest performance appears in execution environments with clear accountability and decision tempo.',
  },
  {
    label: 'Conflict Interpretation',
    content:
      'Conflict posture is direct and structured. The profile performs best when issues are framed explicitly and resolved against measurable outcomes.',
  },
  {
    label: 'Culture Interpretation',
    content:
      'Alignment increases in systems with transparent operating standards and cross-functional visibility over strategic priorities.',
  },
  {
    label: 'Stress Interpretation',
    content:
      'Moderate risk signal under prolonged ambiguity. Decision-rights clarity and tighter operating cadence reduce potential drag.',
  },
]

export default function IndividualResultsPage() {
  return (
    <AppShell>
      <ResultsWorkspaceShell
        title="Individual Results"
        subtitle="Executive behavioural intelligence briefing for Sonartra Signals. Review the dominant behavioural architecture, supporting dimensions, and recommended operating actions."
      >
        <ResultsHero
          dominant={individualResults.profile.dominant}
          secondary={individualResults.profile.secondary}
          summary={individualResults.profile.summary}
          standoutFinding="Execution discipline and strategic pattern recognition are materially above baseline, with the highest signal concentration in Behaviour and Leadership dimensions."
          confidence="High"
        />

        <ResultsSectionBlock
          title="Behavioural Signal Overview"
          description="Top-line dimensions are structured to separate dominant signal strength from supporting behavioural detail."
        >
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {individualResults.radar.map((item) => (
              <TraitScoreCard key={item.name} name={item.name} score={item.score} detail="Signal score" />
            ))}
          </div>
        </ResultsSectionBlock>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <ResultsSectionBlock
            title="Primary Intelligence"
            description="Core behavioural architecture and motivator distribution provide the main explanatory layer for this profile."
          >
            <div className="space-y-4">
              <InsightCard title="Behaviour Architecture" detail="Aggregated axis view of behavioural and contextual dimensions." />
              <RadarSummaryChart data={individualResults.radar} />
              <InsightCard title="Motivational Drivers" detail="Relative motivator weighting highlights sustained behavioural energy sources." />
              <BarList items={individualResults.motivators} />
            </div>
          </ResultsSectionBlock>

          <ResultsSectionBlock
            title="Interpretation Modules"
            description="Translation of measured outputs into operating implications."
          >
            <div className="space-y-4">
              {interpretationModules.map((module) => (
                <InterpretationPanel key={module.label} label={module.label} content={module.content} />
              ))}
            </div>
          </ResultsSectionBlock>
        </div>

        <ResultsSectionBlock title="Action and Next Step" description="Prioritised recommendations to apply profile intelligence in execution contexts.">
          <RecommendationBlock
            title="Recommended Environments"
            items={[
              'Strategic build phases with high accountability and clear ownership boundaries.',
              'Cross-functional transformation programmes tied to measurable targets.',
              'Roles requiring structured decision framing under moderate complexity.',
            ]}
            ctaLabel="Download Board-Ready Report"
          />
        </ResultsSectionBlock>
      </ResultsWorkspaceShell>
    </AppShell>
  )
}
