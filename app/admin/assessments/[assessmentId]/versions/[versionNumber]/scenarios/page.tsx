import { notFound } from 'next/navigation'
import { Activity, ArrowLeft, FlaskConical, FileText } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminAssessmentScenarioLibraryWorkspace } from '@/components/admin/surfaces/AdminAssessmentScenarioLibraryWorkspace'
import { Badge, MetaGrid, SurfaceSection } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import { buildAdminAuditHref } from '@/lib/admin/domain/audit'
import { getAdminAssessmentSimulationWorkspaceStatus } from '@/lib/admin/domain/assessment-simulation'
import { getAdminAssessmentReportPreviewWorkspaceStatus } from '@/lib/admin/domain/assessment-report-output'
import { getAdminAssessmentDetailData } from '@/lib/admin/server/assessment-management'
import { describeDatabaseError, logDatabaseError } from '@/lib/db'
import { listAdminAssessmentVersionScenarios } from '@/lib/admin/server/assessment-regression'

export default async function AdminAssessmentVersionScenariosPage({
  params,
  searchParams,
}: {
  params: { assessmentId: string; versionNumber: string }
  searchParams?: { scenarioId?: string }
}) {
  try {
    const detailData = await getAdminAssessmentDetailData(params.assessmentId)
    if (!detailData) notFound()

    const version = detailData.versions.find((entry) => entry.versionLabel === params.versionNumber)
    if (!version) notFound()

    const scenarios = await listAdminAssessmentVersionScenarios(version)
    const selectedScenario = searchParams?.scenarioId
      ? scenarios.find((scenario) => scenario.id === searchParams.scenarioId) ?? null
      : null

    const simulationStatus = getAdminAssessmentSimulationWorkspaceStatus(version)
    const previewStatus = getAdminAssessmentReportPreviewWorkspaceStatus(version)

    return (
      <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessment regression"
        title={`${detailData.assessment.name} · v${version.versionLabel}`}
        description="Saved simulation scenario library and regression workspace for deterministic pre-publish QA. Use named benchmark scenarios to verify scoring, output behavior, and report quality before release."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to version</Button>
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}/simulate`} variant="ghost"><FlaskConical className="mr-2 h-4 w-4" />Simulation workspace</Button>
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}/report-preview`} variant="ghost"><FileText className="mr-2 h-4 w-4" />Report preview</Button>
            <Button href={buildAdminAuditHref({ entityType: 'assessment_version', entityId: version.id })} variant="ghost"><Activity className="mr-2 h-4 w-4" />Version audit</Button>
          </div>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Scenario library</p>
          <div className="mt-3 flex items-center gap-2"><Badge label={`${scenarios.length} saved`} tone="sky" /></div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">Named QA scenarios remain version-scoped so publish evidence stays deterministic.</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Simulation readiness</p>
          <div className="mt-3 flex items-center gap-2"><Badge label={simulationStatus.statusLabel} tone={simulationStatus.canRunSimulation ? 'emerald' : 'rose'} /></div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{simulationStatus.summary}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Report preview readiness</p>
          <div className="mt-3 flex items-center gap-2"><Badge label={previewStatus.statusLabel} tone={previewStatus.canGeneratePreview ? 'emerald' : 'rose'} /></div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{previewStatus.summary}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Source version</p>
          <p className="mt-3 text-lg font-semibold text-textPrimary">v{version.versionLabel}</p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">Published baseline selection prefers the live version, then the previous version, then this source version.</p>
        </div>
      </div>

      <SurfaceSection title="Workspace context" eyebrow="Operational metadata" description="Saved scenarios are a bounded admin QA layer. They do not create end-user sessions or historical analytics.">
        <MetaGrid
          columns={4}
          items={[
            { label: 'Assessment', value: detailData.assessment.name },
            { label: 'Version', value: `v${version.versionLabel}` },
            { label: 'Lifecycle', value: version.lifecycleStatus },
            { label: 'Package status', value: version.packageInfo.status },
            { label: 'Question count', value: String(version.packageInfo.summary?.questionsCount ?? 0) },
            { label: 'Dimension count', value: String(version.packageInfo.summary?.dimensionsCount ?? 0) },
            { label: 'Output rules', value: String(version.packageInfo.summary?.outputRuleCount ?? 0) },
            { label: 'Default locale', value: (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.meta?.defaultLocale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.metadata?.locales?.defaultLocale ?? 'n/a' },
          ]}
        />
      </SurfaceSection>

      <AdminAssessmentScenarioLibraryWorkspace
        assessmentId={detailData.assessment.id}
        version={version}
        scenarios={scenarios}
        selectedScenario={selectedScenario}
      />
      </div>
    )
  } catch (error) {
    logDatabaseError('Admin assessment version scenarios page load failed.', error, {
      route: '/admin/assessments/[assessmentId]/versions/[versionNumber]/scenarios',
      assessmentId: params.assessmentId,
      versionNumber: params.versionNumber,
      scenarioId: searchParams?.scenarioId ?? null,
      safeMessage: describeDatabaseError(error),
    })
    throw error
  }
}
