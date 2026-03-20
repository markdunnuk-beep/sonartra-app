import { AdminModulePlaceholder } from '@/components/admin/AdminModulePlaceholder'

export default function AdminAssessmentsPage() {
  return (
    <AdminModulePlaceholder
      eyebrow="Assessments registry"
      title="Assessment registry and version control"
      description="Treat assessment definitions as governed system assets with clear registry state, immutable versions, and operational validation context."
      operatingNote="This module will own the registry of Sonartra assessment lines, version lineage, validation state, and publish eligibility so live logic is never overwritten directly."
      pillars={[
        {
          title: 'Registry and lineage',
          detail: 'List assessment families with durable identifiers, current live version, staging versions, and ownership context.',
        },
        {
          title: 'Validation state',
          detail: 'Expose rule failures, preview readiness, and unresolved configuration issues before changes move toward release.',
        },
        {
          title: 'Result traceability',
          detail: 'Keep downstream scoring and reporting attached to immutable assessment version identifiers for auditability.',
        },
      ]}
    />
  )
}
