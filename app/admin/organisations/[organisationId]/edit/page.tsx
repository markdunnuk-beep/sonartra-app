import { notFound } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminOrganisationEditForm } from '@/components/admin/surfaces/AdminOrganisationEditForm'
import { Badge, StatusBadge } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import { getAdminOrganisationDetailData } from '@/lib/admin/server/organisation-detail'

export default async function AdminOrganisationEditPage({ params }: { params: { organisationId: string } }) {
  const detailData = await getAdminOrganisationDetailData(params.organisationId)

  if (!detailData) {
    notFound()
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Organisation edit"
        title={`Edit ${detailData.organisation.name}`}
        description="Safe write surface for organisation identity, lifecycle posture, and scoped audit-aware operational changes."
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={detailData.organisation.status} />
            <Badge label={detailData.organisation.slug} tone="slate" />
            <Button href={`/admin/organisations/${detailData.organisation.id}`} variant="ghost">Back to detail</Button>
          </div>
        )}
      />

      <AdminOrganisationEditForm detailData={detailData} />
    </div>
  )
}
