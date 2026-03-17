import { AppShell } from '@/components/layout/AppShell'
import { Building2, CheckCircle2 } from 'lucide-react'

const tiers = [
  {
    name: 'Small Team',
    description: 'A guided launch path for early team-level signal visibility and aligned leadership rituals.',
    points: ['Up to 25 users', 'Team baseline intelligence', 'Quarterly strategic review support'],
  },
  {
    name: 'Growth',
    description: 'Expanded intelligence for multi-function organisations that need stronger operating coherence at scale.',
    points: ['Up to 250 users', 'Cross-team signal analysis', 'Priority advisory workflows'],
  },
  {
    name: 'Enterprise',
    description: 'Full organisational intelligence architecture for complex environments and executive operating cadences.',
    points: ['Custom user footprint', 'Organisation-wide signal layers', 'Executive insight and governance partnership'],
  },
]

export default function OrganisationPage() {
  return (
    <AppShell>
      <section className="space-y-6">
        <div className="rounded-3xl border border-border/80 bg-panel/70 p-6 sm:p-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-200">
            <Building2 size={14} /> Premium module
          </div>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight text-textPrimary sm:text-3xl">Organisation Intelligence</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary">
            Unlock Sonartra&apos;s organisational layer for multi-user workspace orchestration, team intelligence, organisational signal analysis,
            and reporting insight layers designed for executive decision systems.
          </p>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          {tiers.map((tier) => (
            <article key={tier.name} className="rounded-2xl border border-border/80 bg-bg/55 p-5">
              <h2 className="text-lg font-semibold text-textPrimary">{tier.name}</h2>
              <p className="mt-2 text-sm leading-6 text-textSecondary">{tier.description}</p>
              <ul className="mt-4 space-y-2 text-sm text-textSecondary">
                {tier.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <CheckCircle2 size={16} className="mt-0.5 text-accent" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <div className="rounded-2xl border border-accent/35 bg-accent/10 p-5">
          <p className="text-sm text-textSecondary">Organisation intelligence is currently available via upgrade and pilot onboarding.</p>
          <button className="mt-3 rounded-lg border border-accent/40 bg-accent/20 px-4 py-2 text-sm font-semibold text-textPrimary transition-colors hover:bg-accent/30">
            Request access
          </button>
        </div>
      </section>
    </AppShell>
  )
}
