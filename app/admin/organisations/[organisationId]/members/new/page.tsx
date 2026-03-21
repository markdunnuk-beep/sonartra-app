import { notFound } from 'next/navigation'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminOrganisationMemberCreateForm } from '@/components/admin/surfaces/AdminOrganisationMemberCreateForm'
import { Badge, StatusBadge } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import { getAdminOrganisationDetailData } from '@/lib/admin/server/organisation-detail'
import { getAdminOrganisationMembershipCandidates } from '@/lib/admin/server/organisation-memberships'

export default async function AdminOrganisationMemberNewPage({
  params,
  searchParams,
}: {
  params: { organisationId: string }
  searchParams?: { q?: string }
}) {
  const detailData = await getAdminOrganisationDetailData(params.organisationId)

  if (!detailData) {
    notFound()
  }

  const search = searchParams?.q?.trim() ?? ''
  const candidates = await getAdminOrganisationMembershipCandidates(params.organisationId, search)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Organisation membership"
        title={`Add or invite for ${detailData.organisation.name}`}
        description="Route-first admin workflow for creating truthful organisation memberships, invitations, and role assignments without leaving the organisation operating context."
        actions={(
          <div className="flex items-center gap-2">
            <StatusBadge status={detailData.organisation.status} />
            <Badge label={detailData.organisation.slug} tone="slate" />
            <Button href={`/admin/organisations/${detailData.organisation.id}?tab=members`} variant="ghost">Back to members</Button>
          </div>
        )}
      />

      <AdminOrganisationMemberCreateForm detailData={detailData} candidates={candidates} search={search} />
    </div>
  )
}
