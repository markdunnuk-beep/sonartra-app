import { TopHeader } from '@/components/layout/TopHeader'
import { ProfileSummaryCard } from '@/components/sections/ProfileSummaryCard'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { dashboardSummary, individualResults, measurePillars } from '@/data/mockData'

export default function DashboardPage() {
  return <div><TopHeader title="Dashboard" subtitle="High-level intelligence overview" />
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{dashboardSummary.stats.map((s)=><StatCard key={s.label} {...s} />)}</div>
    <div className="mt-4 grid gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-2"><h3 className="mb-4 text-lg font-semibold">Individual Intelligence Overview</h3><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{measurePillars.map((p,idx)=><div key={p} className="rounded-lg border border-border p-3"><p className="text-sm text-textSecondary">{p}</p><p className="mt-1 text-lg font-semibold">{individualResults.radar[idx].score}</p></div>)}</div></Card>
      <ProfileSummaryCard summary={individualResults.profile.summary} strengths={dashboardSummary.strengths} watchouts={dashboardSummary.watchouts} environment={dashboardSummary.environment} />
    </div>
    <div className="mt-4 grid gap-4 md:grid-cols-3"><Card><h3>Motivational Drivers</h3><p className="mt-2 text-sm text-textSecondary">Achievement and autonomy are dominant drivers with collaborative bias in cross-functional work.</p></Card><Card><h3>Conflict & Pressure Response</h3><p className="mt-2 text-sm text-textSecondary">Direct and fast escalation under uncertainty; benefits from explicit ownership and decision cadence.</p></Card><Card><h3>Culture Alignment</h3><p className="mt-2 text-sm text-textSecondary">Strong alignment with accountability-focused cultures and strategic execution models.</p></Card></div>
  </div>
}
