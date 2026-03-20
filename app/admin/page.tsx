import { Activity, ArrowRight, Binary, FileSearch, Rocket, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Card } from '@/components/ui/Card'
import { StatCard } from '@/components/ui/StatCard'
import { adminDashboardMetrics, adminNavigationItems } from '@/lib/admin/navigation'

const operatingLanes = [
  {
    title: 'Customer tenant control',
    description: 'Monitor organisation posture, seat footprint, enabled assessments, and access boundaries across the customer estate.',
    icon: Activity,
  },
  {
    title: 'Assessment system governance',
    description: 'Keep assessment registry changes versioned, validated, and explicitly tied to publish decisions before anything reaches live use.',
    icon: Binary,
  },
  {
    title: 'Operational traceability',
    description: 'Preserve clear release history and audit evidence for internal actions, validation outcomes, and privileged changes.',
    icon: ShieldCheck,
  },
]

const controlQueue = [
  {
    title: 'Review assessment release readiness',
    description: 'Inspect staged versions, validation status, and publish blockers before promoting changes.',
    href: '/admin/releases',
    label: 'Open releases',
    icon: Rocket,
  },
  {
    title: 'Check audit evidence trail',
    description: 'Verify privileged actions and release history are traceable before expanding operator access.',
    href: '/admin/audit',
    label: 'Open audit',
    icon: FileSearch,
  },
  {
    title: 'Inspect tenant activation posture',
    description: 'Review organisations with enabled assessments and customer-admin dependencies before rollout activity.',
    href: '/admin/organisations',
    label: 'Open organisations',
    icon: Activity,
  },
]

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Administrator platform"
        title="Operational control for Sonartra intelligence systems"
        description="A control layer for customer tenants, assessment release decisions, and enterprise-grade auditability across Sonartra operations."
        actions={
          <Link
            href="/admin/releases"
            className="interaction-control inline-flex items-center gap-2 rounded-xl border border-accent/35 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:border-accent/50 hover:text-[#9fcbff]"
          >
            Review release queue
            <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {adminDashboardMetrics.map((metric) => (
          <StatCard key={metric.label} label={metric.label} value={metric.value} detail={metric.detail} />
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Control queue</p>
          <div className="mt-4 space-y-3">
            {controlQueue.map(({ title, description, href, label, icon: Icon }) => (
              <Link
                key={title}
                href={href}
                className="group block rounded-2xl border border-border/75 bg-bg/45 p-4 transition-colors duration-200 hover:border-accent/25 hover:bg-panel/80"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-sm font-semibold tracking-tight text-textPrimary">{title}</h2>
                      <ArrowRight className="h-4 w-4 text-textSecondary transition-colors group-hover:text-accent" />
                    </div>
                    <p className="mt-1 text-sm leading-6 text-textSecondary">{description}</p>
                    <p className="mt-3 text-[11px] uppercase tracking-[0.14em] text-accent">{label}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Operating model</p>
          <div className="mt-4 grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            {operatingLanes.map(({ title, description, icon: Icon }) => (
              <div key={title} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-accent/20 bg-accent/10 text-accent">
                  <Icon className="h-4 w-4" />
                </div>
                <h2 className="mt-4 text-base font-semibold tracking-tight text-textPrimary">{title}</h2>
                <p className="mt-2 text-sm leading-6 text-textSecondary">{description}</p>
              </div>
            ))}
          </div>
        </Card>
      </section>

      <section>
        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Module map</p>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-textSecondary">
                Each module is framed around an operational decision area so later domain work can attach to clear control boundaries instead of generic admin CRUD.
              </p>
            </div>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {adminNavigationItems.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                className="group block rounded-2xl border border-border/75 bg-bg/45 p-4 transition-colors duration-200 hover:border-accent/25 hover:bg-panel/80"
              >
                <p className="text-sm font-semibold tracking-tight text-textPrimary">{item.label}</p>
                <p className="mt-1 text-sm leading-6 text-textSecondary">{item.description}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-textSecondary/70">
                  {item.requiredCapabilities.join(' · ')}
                </p>
              </Link>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
