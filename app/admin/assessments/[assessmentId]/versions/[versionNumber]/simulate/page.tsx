import { notFound } from 'next/navigation'
import { AdminAssessmentVersionSimulationSurface } from '@/components/admin/surfaces/AdminAssessmentVersionSimulationSurface'
import { getAdminAssessmentDetailData } from '@/lib/admin/server/assessment-management'
import { getAdminAssessmentScenarioById } from '@/lib/admin/server/assessment-regression'

export default async function AdminAssessmentVersionSimulationPage({
  params,
  searchParams,
}: {
  params: { assessmentId: string; versionNumber: string }
  searchParams?: { scenarioId?: string }
}) {
  const detailData = await getAdminAssessmentDetailData(params.assessmentId)

  if (!detailData) {
    notFound()
  }

  const version = detailData.versions.find((entry) => entry.versionLabel === params.versionNumber)

  if (!version) {
    notFound()
  }

  const selectedScenario = searchParams?.scenarioId ? await getAdminAssessmentScenarioById({ assessmentId: params.assessmentId, versionId: version.id, scenarioId: searchParams.scenarioId }) : null

  return <AdminAssessmentVersionSimulationSurface detailData={detailData} version={version} selectedScenarioPayload={selectedScenario?.sampleResponsePayload ?? null} />
}
