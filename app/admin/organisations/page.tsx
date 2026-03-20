import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Card } from '@/components/ui/Card'
import { organisations, formatSeatUsageSummary, getSeatUtilisationPercent, getStatusLabel } from '@/lib/admin/domain'

export default function AdminOrganisationsPage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Organisations"
        title="Customer tenant operations"
        description="Manage the customer tenant estate with clarity around workspace status, seat posture, enabled assessments, and operating health."
      />

      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Operational intent</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary">
          This module will become the control point for customer organisations: who is live, what capacity is provisioned, which assessments are enabled, and where rollout dependencies require operator attention.
        </p>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)]">
        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Tenant registry</p>
          <div className="mt-4 space-y-3">
            {organisations.map((organisation) => (
              <div key={organisation.id} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-textPrimary">{organisation.name}</h2>
                    <p className="mt-1 text-sm leading-6 text-textSecondary">
                      {getStatusLabel(organisation.status)} · {getStatusLabel(organisation.plan)} · {organisation.region} · {organisation.sector}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border/75 px-3 py-2 text-right text-xs uppercase tracking-[0.14em] text-textSecondary">
                    {formatSeatUsageSummary(organisation)}
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm leading-6 text-textSecondary">
                  <p>Enablement: {organisation.enabledProducts.filter((product) => product.enabled).map((product) => product.label).join(', ')}</p>
                  <p>Workspace: {organisation.workspaceProvisionedAt ? 'Provisioned' : 'Pending'}</p>
                  <p>Utilisation: {getSeatUtilisationPercent(organisation)}%</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Control areas</p>
          <div className="mt-4 space-y-4 text-sm leading-6 text-textSecondary">
            <div>
              <h2 className="text-base font-semibold tracking-tight text-textPrimary">Tenant registry</h2>
              <p className="mt-2">Track organisation identity, commercial status, workspace lifecycle, and service posture without collapsing tenants into a generic CRM abstraction.</p>
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-textPrimary">Seat and enablement view</h2>
              <p className="mt-2">Surface seat usage, enabled assessments, and activation dependencies so customer rollout decisions remain operationally grounded.</p>
            </div>
            <div>
              <h2 className="text-base font-semibold tracking-tight text-textPrimary">Activity and intervention signals</h2>
              <p className="mt-2">Highlight dormant tenants, suspended accounts, and configuration exceptions that require internal review.</p>
            </div>
          </div>
        </Card>
      </section>
    </div>
  )
}
