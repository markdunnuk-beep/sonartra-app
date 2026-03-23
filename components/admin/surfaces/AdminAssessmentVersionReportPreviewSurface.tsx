import React from 'react'
import { Activity, ArrowLeft, FileText, FlaskConical } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminAssessmentSimulationWorkspace } from '@/components/admin/surfaces/AdminAssessmentSimulationWorkspace'
import { Badge, EmptyState, MetaGrid, SurfaceSection } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import type { AdminAssessmentDetailData, AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import { getAssessmentPackageStatusLabel } from '@/lib/admin/domain/assessment-package'
import { getAdminAssessmentVersionReadiness } from '@/lib/admin/domain/assessment-package-review'
import { getAdminAssessmentReportPreviewWorkspaceStatus } from '@/lib/admin/domain/assessment-report-output'
import { getAdminAssessmentSimulationWorkspaceStatus } from '@/lib/admin/domain/assessment-simulation'
import { buildAdminAuditHref } from '@/lib/admin/domain/audit'
import { formatAdminTimestamp } from '@/lib/admin/wireframe'

function getTone(status: 'available' | 'blocked') {
  return status === 'available' ? 'sky' as const : 'rose' as const
}

function getPreviewUnavailableTitle(blockingReason: string | null) {
  if (blockingReason && /At least one normalized question is required/i.test(blockingReason)) {
    return 'Report preview unsupported for this package state'
  }

  return 'Report preview not ready yet'
}

function getPreviewUnavailableActionLabel(blockingReason: string | null) {
  if (blockingReason && /run simulation/i.test(blockingReason)) {
    return 'Run simulation'
  }

  return 'Open simulation workspace'
}

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

export function AdminAssessmentVersionReportPreviewSurface({
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
  const previewStatus = getAdminAssessmentReportPreviewWorkspaceStatus(version)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Report-output preview"
        title={`${detailData.assessment.name} · v${version.versionLabel}`}
        description="Internal generation workspace for turning sample simulation results into Sonartra’s structured web-summary and PDF-ready output models. This is a preview and QA layer, not the final user report or renderer."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to version</Button>
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}/simulate`} variant="ghost"><FlaskConical className="mr-2 h-4 w-4" />Simulation workspace</Button>
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}/scenarios`} variant="ghost">Scenario library</Button>
            <Button href={buildAdminAuditHref({ entityType: 'assessment_version', entityId: version.id })} variant="ghost"><Activity className="mr-2 h-4 w-4" />Version audit</Button>
          </div>
        )}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Preview availability</p>
          <div className="mt-3 flex items-center gap-2">
            <Badge label={previewStatus.statusLabel} tone={getTone(previewStatus.availability)} />
            <FileText className="h-4 w-4 text-textSecondary" />
          </div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{previewStatus.summary}</p>
          {previewStatus.blockingReason ? <p className="mt-2 text-xs leading-5 text-textSecondary">{previewStatus.blockingReason}</p> : null}
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
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Simulation basis</p>
          <div className="mt-3"><Badge label={simulationStatus.statusLabel} tone={simulationStatus.canRunSimulation ? 'sky' : 'rose'} /></div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{simulationStatus.summary}</p>
        </div>
      </div>

      <SurfaceSection
        title="Workspace context"
        eyebrow="Version + generation scope"
        description="Preview generation always uses the normalized package as source of truth and a freshly-run sample scenario from this page. Nothing is persisted as an end-user result in v1."
      >
        <MetaGrid
          columns={3}
          items={[
            { label: 'Assessment', value: detailData.assessment.name },
            { label: 'Version', value: `v${version.versionLabel}` },
            { label: 'Lifecycle', value: version.lifecycleStatus },
            { label: 'Package status', value: version.packageInfo.status },
            { label: 'Questions', value: String(version.packageInfo.summary?.questionsCount ?? 0) },
            { label: 'Dimensions', value: String(version.packageInfo.summary?.dimensionsCount ?? 0) },
            { label: 'Output rules', value: String(version.packageInfo.summary?.outputRuleCount ?? 0) },
            { label: 'Locale', value: (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.meta?.defaultLocale ?? (version.normalizedPackage as { meta?: { defaultLocale?: string }; metadata?: { locales?: { defaultLocale?: string } } } | null)?.metadata?.locales?.defaultLocale ?? 'n/a' },
            { label: 'Imported at', value: formatAdminTimestamp(version.packageInfo.importedAt) },
          ]}
        />
      </SurfaceSection>

      {previewStatus.canGeneratePreview ? (
        <AdminAssessmentSimulationWorkspace
          assessmentId={detailData.assessment.id}
          version={version}
          workspaceCopy={{
            title: 'Report preview input',
            eyebrow: 'Sample response scenario',
            description: 'Run a sample scenario here to generate structured report-output blocks, traceability evidence, and output-quality signals. This preview depends on a successful simulation result but does not persist a respondent session.',
            resultsTitle: 'Generated report-output preview',
            resultsEyebrow: 'Structured web + PDF-ready model',
            resultsDescription: 'After the sample scenario runs, this section shows the structured summary model, PDF-ready content blocks, traceability, warnings, and output-quality evidence.',
            emptyResultsTitle: 'No report preview yet for this version',
            emptyResultsDetail: 'Run simulation to generate report preview evidence. Report preview becomes available after a successful simulation using the normalized package.',
          }}
          postResultsVariant="report_preview"
          initialRequestPayload={selectedScenarioPayload}
        />
      ) : (
        <SurfaceSection
          title="Report preview workspace"
          eyebrow="Workflow step"
          description="Report preview becomes available after the version can run a truthful admin simulation."
        >
          <EmptyState
            title={getPreviewUnavailableTitle(previewStatus.blockingReason)}
            detail={previewStatus.blockingReason ?? 'Run a simulation-ready package import first, then generate a preview from a sample scenario.'}
            action={<Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}/simulate`} variant="secondary">{getPreviewUnavailableActionLabel(previewStatus.blockingReason)}</Button>}
          />
        </SurfaceSection>
      )}
    </div>
  )
}
