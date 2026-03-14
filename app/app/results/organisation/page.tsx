import { TopHeader } from '@/components/layout/TopHeader'
import { TeamMatrix } from '@/components/sections/TeamMatrix'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { organisationResults } from '@/data/mockData'

export default function OrganisationResultsPage() {
  return (
    <div>
      <TopHeader title="Organisation Intelligence" subtitle="Team and enterprise behavioural signals" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {organisationResults.stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} />
        ))}
      </div>

      <div className="mt-6">
        <TeamMatrix members={organisationResults.members} />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="panel-hover">
          <h3 className="text-lg font-semibold">Leadership Distribution</h3>
          <p className="mt-2 text-sm text-textSecondary">Operator profiles dominate 44% of assessed population.</p>
        </Card>
        <Card className="panel-hover">
          <h3 className="text-lg font-semibold">Cultural Alignment</h3>
          <p className="mt-2 text-sm text-textSecondary">Highest alignment in Product and Operations. Emerging tension in GTM pods.</p>
        </Card>
        <Card className="panel-hover">
          <h3 className="text-lg font-semibold">Risk Indicators</h3>
          <p className="mt-2 text-sm text-textSecondary">Escalation risk concentrated in two high-interdependency functions.</p>
        </Card>
        <Card className="panel-hover">
          <h3 className="text-lg font-semibold">Cognitive Diversity Snapshot</h3>
          <p className="mt-2 text-sm text-textSecondary">Strategist and Integrator blend healthy. Catalyst representation below target.</p>
        </Card>
      </div>
    </div>
  )
}
