import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { RadarSummaryChart } from '@/components/charts/RadarSummaryChart'
import { BarList } from '@/components/ui/BarList'
import { Button } from '@/components/ui/Button'
import { ResultsSection } from '@/components/ui/ResultsSection'
import { individualResults } from '@/data/mockData'

export default function IndividualResultsPage() {
  return (
    <AppShell>
      <div className="space-y-7 lg:space-y-9">
        <TopHeader title="Individual Results" subtitle="Executive behavioural intelligence report" />

        <ResultsSection title="Executive Summary">
          <p className="text-sm leading-6 text-textSecondary">
            Dominant style: <span className="text-textPrimary">{individualResults.profile.dominant}</span> • Secondary style:{' '}
            <span className="text-textPrimary">{individualResults.profile.secondary}</span>
          </p>
          <p className="text-sm leading-6 text-textSecondary">{individualResults.profile.summary}</p>
        </ResultsSection>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {individualResults.radar.map((item) => (
            <ResultsSection key={item.name} title={item.name}>
              <p className="text-3xl font-semibold tracking-tight text-textPrimary">{item.score}</p>
              <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">Signal score</p>
            </ResultsSection>
          ))}
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <div className="space-y-4 xl:col-span-2">
            <ResultsSection title="Behaviour Architecture">
              <RadarSummaryChart data={individualResults.radar} />
            </ResultsSection>
            <ResultsSection title="Motivational Drivers">
              <BarList items={individualResults.motivators} />
            </ResultsSection>
          </div>

          <div className="space-y-4">
            <ResultsSection title="Leadership">
              <p className="text-sm leading-6 text-textSecondary">
                Operates as a precision-oriented strategic driver. Effective in complex execution contexts requiring clarity
                and pace.
              </p>
            </ResultsSection>
            <ResultsSection title="Conflict">
              <p className="text-sm leading-6 text-textSecondary">
                Direct and structured. Prefers explicit problem framing and rapid path-to-resolution.
              </p>
            </ResultsSection>
            <ResultsSection title="Culture">
              <p className="text-sm leading-6 text-textSecondary">
                High alignment in systems with transparent accountability and data-led decision governance.
              </p>
            </ResultsSection>
            <ResultsSection title="Stress">
              <p className="text-sm leading-6 text-textSecondary">
                Moderate risk under prolonged ambiguity. Mitigation: increase decision rights clarity and operating cadence.
              </p>
            </ResultsSection>
          </div>
        </div>

        <ResultsSection title="Recommended Environments">
          <p className="text-sm leading-6 text-textSecondary">
            Best in strategic build phases, transformation programmes, and cross-functional delivery with measurable
            targets.
          </p>
        </ResultsSection>

        <ResultsSection title="Report Export">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-textSecondary">Export a board-ready summary of behavioural architecture and risk signals.</p>
            <Button>Download PDF</Button>
          </div>
        </ResultsSection>
      </div>
    </AppShell>
  )
}
