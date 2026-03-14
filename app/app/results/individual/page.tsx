import { TopHeader } from '@/components/layout/TopHeader'
import { RadarSummaryChart } from '@/components/charts/RadarSummaryChart'
import { BarList } from '@/components/ui/BarList'
import { Button } from '@/components/ui/Button'
import { ResultsSection } from '@/components/ui/ResultsSection'
import { individualResults } from '@/data/mockData'

export default function IndividualResultsPage() {
  return <div className="space-y-4"><TopHeader title="Individual Results" subtitle="Sonartra Signals report" />
    <ResultsSection title="Profile Overview"><p className="text-textSecondary">Dominant style: {individualResults.profile.dominant} • Secondary style: {individualResults.profile.secondary}</p><p className="text-sm text-textSecondary">{individualResults.profile.summary}</p></ResultsSection>
    <ResultsSection title="Behaviour Style"><RadarSummaryChart data={individualResults.radar} /></ResultsSection>
    <ResultsSection title="Motivational Drivers"><BarList items={individualResults.motivators} /></ResultsSection>
    <ResultsSection title="Leadership Architecture"><p className="text-sm text-textSecondary">Operates as a precision-oriented strategic driver. Effective in complex execution contexts requiring clarity and pace.</p></ResultsSection>
    <ResultsSection title="Conflict Style"><p className="text-sm text-textSecondary">Direct and structured. Prefers explicit problem framing and rapid path-to-resolution.</p></ResultsSection>
    <ResultsSection title="Culture Alignment"><p className="text-sm text-textSecondary">High alignment in systems with transparent accountability and data-led decision governance.</p></ResultsSection>
    <ResultsSection title="Stress & Derailer Risk"><p className="text-sm text-textSecondary">Moderate risk under prolonged ambiguity. Mitigation: increase decision rights clarity and operating cadence.</p></ResultsSection>
    <ResultsSection title="Recommended Environments"><p className="text-sm text-textSecondary">Best in strategic build phases, transformation programmes, and cross-functional delivery with measurable targets.</p></ResultsSection>
    <ResultsSection title="Download Report"><div className="flex items-center justify-between"><p className="text-sm text-textSecondary">Export a board-ready summary of behavioural architecture and risk signals.</p><Button>Download PDF</Button></div></ResultsSection>
  </div>
}
