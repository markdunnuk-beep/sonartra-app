import React from 'react'
import { Activity, ArrowLeft, FileJson2, FlaskConical } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminAssessmentSimulationWorkspace } from '@/components/admin/surfaces/AdminAssessmentSimulationWorkspace'
import { Badge, MetaGrid, SurfaceSection } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import type { AdminAssessmentDetailData, AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import { buildAdminAuditHref } from '@/lib/admin/domain/audit'
import { getAssessmentPackageStatusLabel } from '@/lib/admin/domain/assessment-package'
import { getAdminAssessmentVersionReadiness } from '@/lib/admin/domain/assessment-package-review'
import { getAdminAssessmentSimulationWorkspaceStatus } from '@/lib/admin/domain/assessment-simulation'
import { formatAdminTimestamp } from '@/lib/admin/wireframe'

function getReadinessTone(verdict: 'ready' | 'ready_with_warnings' | 'blocked') {
  switch (verdict) {
    case 'ready':
      return 'emerald' as const
    case 'ready_with_warnings':
      return 'amber' as const
    default:
      return 'rose' as const
  }
}

function getEligibilityTone(status: ReturnType<typeof getAdminAssessmentSimulationWorkspaceStatus>['eligibility']) {
  return status === 'eligible' ? 'sky' : 'rose'
}

export function AdminAssessmentVersionSimulationSurface({
  detailData,
  version,
  selectedScenarioPayload,
}: {
  detailData: AdminAssessmentDetailData
  version: AdminAssessmentVersionRecord
  selectedScenarioPayload?: string | null
}) {
  const readiness = getAdminAssessmentVersionReadiness(version)
  const simulationStatus = getAdminAssessmentSimulationWorkspaceStatus(version)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessment simulation"
        title={`${detailData.assessment.name} · v${version.versionLabel}`}
        description="Controlled admin-grade simulation workspace for draft and published packages. This surface verifies scoring, normalization, and output-rule behavior without exposing the public respondent runtime."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to version</Button>
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}/import`} variant="ghost"><FileJson2 className="mr-2 h-4 w-4" />Package import</Button>
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}/scenarios`} variant="ghost">Scenario library</Button>
            <Button href={buildAdminAuditHref({ entityType: 'assessment_version', entityId: version.id })} variant="ghost"><Activity className="mr-2 h-4 w-4" />Version audit</Button>
          </div>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Simulation status</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge label={simulationStatus.statusLabel} tone={getEligibilityTone(simulationStatus.eligibility)} />
            <FlaskConical className="h-4 w-4 text-textSecondary" />
          </div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{simulationStatus.summary}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Package state</p>
          <div className="mt-3"><Badge label={getAssessmentPackageStatusLabel(version.packageInfo.status)} tone={version.packageInfo.status === 'valid' ? 'emerald' : version.packageInfo.status === 'valid_with_warnings' ? 'amber' : version.packageInfo.status === 'invalid' ? 'rose' : 'slate'} /></div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">Imported {formatAdminTimestamp(version.packageInfo.importedAt)} · source {version.packageInfo.sourceFilename ?? 'not supplied'}.</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Readiness verdict</p>
          <div className="mt-3"><Badge label={readiness.verdict.replace(/_/g, ' ')} tone={getReadinessTone(readiness.verdict)} /></div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{readiness.summary}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Simulation scope</p>
          <p className="mt-3 text-lg font-semibold text-textPrimary">{version.normalizedPackage ? `${version.normalizedPackage.questions.length} questions` : 'No package'}</p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{version.normalizedPackage ? `${version.normalizedPackage.dimensions.length} dimensions · ${version.normalizedPackage.outputs?.reportRules.length ?? 0} output rules · locale ${version.normalizedPackage.meta.defaultLocale}.` : 'Questions, dimensions, and output rules appear once the package validates.'}</p>
        </div>
      </div>

      <SurfaceSection
        title="Workspace context"
        eyebrow="Version + readiness context"
        description="The simulation workspace stays anchored to the same version evidence used during import review and publish readiness."
      >
        <MetaGrid
          columns={3}
          items={[
            { label: 'Assessment', value: detailData.assessment.name },
            { label: 'Version', value: `v${version.versionLabel}` },
            { label: 'Lifecycle', value: version.lifecycleStatus },
            { label: 'Package status', value: version.packageInfo.status },
            { label: 'Imported by', value: version.packageInfo.importedByName ?? 'Unknown' },
            { label: 'Imported at', value: formatAdminTimestamp(version.packageInfo.importedAt) },
            { label: 'Questions', value: String(version.packageInfo.summary?.questionsCount ?? 0) },
            { label: 'Dimensions', value: String(version.packageInfo.summary?.dimensionsCount ?? 0) },
            { label: 'Outputs', value: String(version.packageInfo.summary?.outputRuleCount ?? 0) },
          ]}
        />
      </SurfaceSection>

      <AdminAssessmentSimulationWorkspace assessmentId={detailData.assessment.id} version={version} initialRequestPayload={selectedScenarioPayload} />
    </div>
  )
}
