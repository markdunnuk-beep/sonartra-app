import { notFound } from 'next/navigation'
import { AdminOrganisationDetailSurface } from '@/components/admin/surfaces/AdminOrganisationDetailSurface'
import { getAdminOrganisationDetailTab } from '@/lib/admin/domain/organisation-detail'
import { getAdminOrganisationMemberFilters } from '@/lib/admin/domain/organisation-memberships'
import { getAdminOrganisationDetailData } from '@/lib/admin/server/organisation-detail'

export default async function AdminOrganisationDetailPage({
  params,
  searchParams,
}: {
  params: { organisationId: string }
  searchParams?: {
    tab?: string
    mutation?: string
    membersSearch?: string
    memberRole?: string
    memberStatus?: string
  }
}) {
  const organisation = await getAdminOrganisationDetailData(params.organisationId)

  if (!organisation) {
    notFound()
  }

  return (
    <AdminOrganisationDetailSurface
      detailData={organisation}
      activeTab={getAdminOrganisationDetailTab(searchParams?.tab)}
      mutation={searchParams?.mutation}
      memberFilters={getAdminOrganisationMemberFilters(searchParams)}
    />
  )
}
