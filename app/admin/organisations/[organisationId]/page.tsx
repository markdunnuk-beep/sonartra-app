import { notFound } from 'next/navigation'
import { AdminOrganisationDetailSurface } from '@/components/admin/surfaces/AdminOrganisationDetailSurface'
import { getAdminOrganisationDetailTab } from '@/lib/admin/domain/organisation-detail'
import { getAdminOrganisationDetailData } from '@/lib/admin/server/organisation-detail'

export default async function AdminOrganisationDetailPage({
  params,
  searchParams,
}: {
  params: { organisationId: string }
  searchParams?: { tab?: string }
}) {
  const organisation = await getAdminOrganisationDetailData(params.organisationId)

  if (!organisation) {
    notFound()
  }

  return (
    <AdminOrganisationDetailSurface
      detailData={organisation}
      activeTab={getAdminOrganisationDetailTab(searchParams?.tab)}
    />
  )
}
