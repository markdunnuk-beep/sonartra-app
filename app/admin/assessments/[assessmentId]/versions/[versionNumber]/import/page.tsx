import { notFound } from 'next/navigation'
import { AdminAssessmentVersionDetailSurface } from '@/components/admin/surfaces/AdminAssessmentVersionDetailSurface'
import { getAdminAssessmentDetailData } from '@/lib/admin/server/assessment-management'

export default async function AdminAssessmentVersionImportPage({
  params,
  searchParams,
}: {
  params: { assessmentId: string; versionNumber: string }
  searchParams?: { mutation?: string }
}) {
  const detailData = await getAdminAssessmentDetailData(params.assessmentId)

  if (!detailData) {
    notFound()
  }

  const version = detailData.versions.find((entry) => entry.versionLabel === params.versionNumber)

  if (!version) {
    notFound()
  }

  return <AdminAssessmentVersionDetailSurface detailData={detailData} version={version} mode="import" mutation={searchParams?.mutation} />
}
