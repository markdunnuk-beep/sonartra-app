import { notFound } from 'next/navigation'
import { AdminAssessmentVersionReportPreviewSurface } from '@/components/admin/surfaces/AdminAssessmentVersionReportPreviewSurface'
import { getAdminAssessmentDetailData } from '@/lib/admin/server/assessment-management'

export default async function AdminAssessmentVersionReportPreviewPage({
  params,
}: {
  params: { assessmentId: string; versionNumber: string }
}) {
  const detailData = await getAdminAssessmentDetailData(params.assessmentId)

  if (!detailData) {
    notFound()
  }

  const version = detailData.versions.find((entry) => entry.versionLabel === params.versionNumber)

  if (!version) {
    notFound()
  }

  return <AdminAssessmentVersionReportPreviewSurface detailData={detailData} version={version} />
}
