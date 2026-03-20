import { AdminModulePlaceholder } from '@/components/admin/AdminModulePlaceholder'

export default function AdminOrganisationsPage() {
  return (
    <AdminModulePlaceholder
      eyebrow="Organisations"
      title="Customer tenant operations"
      description="Manage the customer tenant estate with clarity around workspace status, seat posture, enabled assessments, and operating health."
      operatingNote="This module will become the control point for customer organisations: who is live, what capacity is provisioned, which assessments are enabled, and where rollout dependencies require operator attention."
      pillars={[
        {
          title: 'Tenant registry',
          detail: 'Track organisation identity, commercial status, workspace lifecycle, and service posture without collapsing tenants into a generic CRM abstraction.',
        },
        {
          title: 'Seat and enablement view',
          detail: 'Surface seat usage, enabled assessments, and activation dependencies so customer rollout decisions remain operationally grounded.',
        },
        {
          title: 'Activity and intervention signals',
          detail: 'Highlight dormant tenants, suspended accounts, and configuration exceptions that require internal review.',
        },
      ]}
    />
  )
}
