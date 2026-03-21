import { notFound } from 'next/navigation'
import { AdminAssessmentDetailSurface } from '@/components/admin/surfaces/AdminAssessmentDetailSurface'
import { getAdminAssessmentDetailTab } from '@/lib/admin/domain/assessment-management'
import { getAdminAssessmentDetailData } from '@/lib/admin/server/assessment-management'

export default async function AdminAssessmentDetailPage({
  params,
  searchParams,
}: {
  params: { assessmentId: string }
  searchParams?: { tab?: string; mutation?: string }
}) {
  const detailData = await getAdminAssessmentDetailData(params.assessmentId)

  if (!detailData) {
    notFound()
  }

  return <AdminAssessmentDetailSurface detailData={detailData} activeTab={getAdminAssessmentDetailTab(searchParams?.tab)} mutation={searchParams?.mutation} />
}
