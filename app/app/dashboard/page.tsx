import { TopHeader } from '@/components/layout/TopHeader'
import { ProfileSummaryCard } from '@/components/sections/ProfileSummaryCard'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { dashboardSummary, individualResults, measurePillars } from '@/data/mockData'

export default function DashboardPage() {
  return (
    <div>
      <TopHeader title="Dashboard" subtitle="High-level intelligence overview" />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardSummary.stats.map((s) => <StatCard key={s.label} {...s} />)}
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-3">
        <Card className="panel-hover xl:col-span-2">
          <h3 className="text-lg font-semibold text-textPrimary">Individual Intelligence Overview</h3>
          <p className="mt-1 text-sm text-textSecondary">Six-pillar behavioural index from Signals.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {measurePillars.map((p, idx) => (
              <div key={p} className="rounded-lg border border-border/90 bg-bg/50 p-3">
                <p className="text-xs uppercase tracking-wide text-textSecondary">{p}</p>
                <p className="mt-2 text-xl font-semibold text-textPrimary">{individualResults.radar[idx].score}</p>
              </div>
            ))}
          </div>
        </Card>

        <ProfileSummaryCard
          summary={individualResults.profile.summary}
          strengths={dashboardSummary.strengths}
          watchouts={dashboardSummary.watchouts}
          environment={dashboardSummary.environment}
        />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card className="panel-hover">
          <h3 className="text-lg font-semibold">Motivational Drivers</h3>
          <p className="mt-2 text-sm text-textSecondary">Achievement and autonomy dominate, with collaboration rising in cross-functional execution.</p>
        </Card>
        <Card className="panel-hover">
          <h3 className="text-lg font-semibold">Conflict & Pressure Response</h3>
          <p className="mt-2 text-sm text-textSecondary">Direct escalation under uncertainty. Benefits from explicit ownership and clear decision cadence.</p>
        </Card>
        <Card className="panel-hover">
          <h3 className="text-lg font-semibold">Culture Alignment</h3>
          <p className="mt-2 text-sm text-textSecondary">Strong fit in accountability-led teams with measurable operating metrics and decision discipline.</p>
        </Card>
      </div>
    </div>
  )
}
