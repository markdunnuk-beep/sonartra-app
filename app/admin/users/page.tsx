import { AdminModulePlaceholder } from '@/components/admin/AdminModulePlaceholder'

export default function AdminUsersPage() {
  return (
    <AdminModulePlaceholder
      eyebrow="Users and permissions"
      title="Internal and customer access control"
      description="Separate Sonartra operators from customer-side admins and members so privileged controls stay isolated from tenant administration."
      operatingNote="This module will coordinate internal admin access, customer admin membership, invite state, and role changes across tenants without blending Sonartra governance responsibilities into organisation-level permissions."
      pillars={[
        {
          title: 'Internal admin roles',
          detail: 'Evolve the bootstrap allowlist into explicit Sonartra operator roles for release control, audit review, and privileged administration.',
        },
        {
          title: 'Customer memberships',
          detail: 'Show who belongs to which tenant, their admin status, and any invitation or access-state anomalies affecting rollout.',
        },
        {
          title: 'Permission review workflow',
          detail: 'Prepare for least-privilege checks, role change approvals, and clear review history across privileged actions.',
        },
      ]}
    />
  )
}
