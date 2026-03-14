import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { TeamMatrix } from '@/components/sections/TeamMatrix'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { organisationResults } from '@/data/mockData'

export default function OrganisationResultsPage() {
  return (
    <AppShell>
      <div className="space-y-7 lg:space-y-9">
        <TopHeader title="Organisation Intelligence" subtitle="Team and enterprise behavioural signals" />

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Organisation summary</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {organisationResults.stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} />
            ))}
          </div>
        </section>

        <TeamMatrix members={organisationResults.members} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <h3 className="text-base font-semibold">Leadership Distribution</h3>
            <p className="mt-3 text-sm leading-6 text-textSecondary">Operator profiles dominate 44% of assessed population.</p>
          </Card>
          <Card>
            <h3 className="text-base font-semibold">Cultural Alignment</h3>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Highest alignment in Product and Operations. Emerging tension in GTM pods.
            </p>
          </Card>
          <Card>
            <h3 className="text-base font-semibold">Risk Indicators</h3>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Escalation risk concentrated in two high-interdependency functions.
            </p>
          </Card>
          <Card>
            <h3 className="text-base font-semibold">Team Intelligence Matrix Signal</h3>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Strategist and Integrator blend healthy. Catalyst representation below target.
            </p>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
