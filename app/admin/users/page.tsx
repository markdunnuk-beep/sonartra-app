import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { Card } from '@/components/ui/Card'
import { internalAdminRoleSummaries } from '@/lib/admin/navigation'
import { adminUsers, getStatusLabel, organisationMemberships } from '@/lib/admin/domain'

export default function AdminUsersPage() {
  const internalAdmins = adminUsers.filter((user) => user.kind === 'internal_admin')
  const organisationUsers = adminUsers.filter((user) => user.kind === 'organisation_user')

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Users and permissions"
        title="Internal and customer access control"
        description="Separate Sonartra operators from customer-side admins and members so privileged controls stay isolated from tenant administration."
      />

      <Card className="px-6 py-5 sm:px-7 sm:py-6">
        <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Operational intent</p>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary">
          This module will coordinate internal admin access, customer admin membership, invite state, and role changes across tenants without blending Sonartra governance responsibilities into organisation-level permissions.
        </p>
      </Card>

      <section className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Internal admin roles</p>
          <div className="mt-4 space-y-3">
            {internalAdminRoleSummaries.map((role) => (
              <div key={role.role} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
                <h2 className="text-base font-semibold tracking-tight text-textPrimary">{role.label}</h2>
                <p className="mt-2 text-sm leading-6 text-textSecondary">{role.description}</p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.14em] text-textSecondary/70">{role.capabilities.join(' · ')}</p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">User population</p>
          <div className="mt-4 space-y-3">
            {[...internalAdmins, ...organisationUsers].map((user) => (
              <div key={user.id} className="rounded-2xl border border-border/75 bg-bg/45 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-textPrimary">{user.profile.fullName}</h2>
                    <p className="mt-1 text-sm leading-6 text-textSecondary">{user.email}</p>
                  </div>
                  <div className="text-right text-xs uppercase tracking-[0.14em] text-textSecondary">
                    <p>{getStatusLabel(user.kind)}</p>
                    <p className="mt-1">{getStatusLabel(user.status)}</p>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm leading-6 text-textSecondary">
                  <p>Role: {user.internalAdminRole ? getStatusLabel(user.internalAdminRole) : 'Organisation user'}</p>
                  <p>Memberships: {organisationMemberships.filter((membership) => membership.userId === user.id).length}</p>
                  <p>Last active: {user.recentActivity.lastActiveAt ?? 'Awaiting first activity'}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  )
}
