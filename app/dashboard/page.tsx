import { AppShell } from '@/components/layout/AppShell'
import { TopHeader } from '@/components/layout/TopHeader'
import { ProfileSummaryCard } from '@/components/sections/ProfileSummaryCard'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { dashboardSummary, individualResults, measurePillars } from '@/data/mockData'

export default function DashboardPage() {
  return (
    <AppShell>
      <div className="space-y-6 lg:space-y-8">
        <TopHeader title="Dashboard" subtitle="High-level intelligence overview" />

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-textSecondary">Executive summary</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {dashboardSummary.stats.map((s) => (
              <StatCard key={s.label} {...s} />
            ))}
          </div>
        </section>

        <section className="grid gap-4 xl:grid-cols-3">
          <Card className="xl:col-span-2">
            <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4">
              <div>
                <h3 className="text-lg font-semibold">Individual Intelligence Overview</h3>
                <p className="mt-1 text-sm text-textSecondary">Behavioural profile signals across Sonartra&apos;s six core domains.</p>
              </div>
              <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">Latest cycle</p>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {measurePillars.map((pillar, idx) => (
                <div key={pillar} className="rounded-lg border border-border/80 bg-bg/60 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-textSecondary">{pillar}</p>
                  <p className="mt-2 text-2xl font-semibold text-textPrimary">{individualResults.radar[idx].score}</p>
                  <p className="mt-1 text-xs text-textSecondary">Signal score</p>
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
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <Card>
            <h3 className="text-base font-semibold">Motivational Drivers</h3>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Achievement and autonomy are dominant drivers with collaborative bias in cross-functional work.
            </p>
          </Card>
          <Card>
            <h3 className="text-base font-semibold">Conflict & Pressure Response</h3>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Direct and fast escalation under uncertainty; benefits from explicit ownership and decision cadence.
            </p>
          </Card>
          <Card>
            <h3 className="text-base font-semibold">Culture Alignment</h3>
            <p className="mt-3 text-sm leading-6 text-textSecondary">
              Strong alignment with accountability-focused cultures and strategic execution models.
            </p>
          </Card>
        </section>
      </div>
    </AppShell>
  )
}
