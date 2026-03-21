import { notFound } from 'next/navigation'
import { AdminAssessmentVersionSimulationSurface } from '@/components/admin/surfaces/AdminAssessmentVersionSimulationSurface'
import { getAdminAssessmentDetailData } from '@/lib/admin/server/assessment-management'

export default async function AdminAssessmentVersionSimulationPage({
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

  return <AdminAssessmentVersionSimulationSurface detailData={detailData} version={version} />
}
