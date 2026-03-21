import React from 'react'
import { Activity, ArrowLeft, FileJson2 } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminAssessmentVersionPackageImportForm } from '@/components/admin/surfaces/AdminAssessmentVersionPackageImportForm'
import { Badge, EmptyState, MetaGrid, SurfaceSection, Table } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import type { AdminAssessmentDetailData, AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import { buildAdminAuditHref, getAdminAuditEventLabel, getAdminAuditEventTone } from '@/lib/admin/domain/audit'
import { getAssessmentPackageStatusLabel } from '@/lib/admin/domain/assessment-package'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

function getPackageTone(status: AdminAssessmentVersionRecord['packageInfo']['status']) {
  switch (status) {
    case 'valid':
      return 'emerald' as const
    case 'valid_with_warnings':
      return 'amber' as const
    case 'invalid':
      return 'rose' as const
    default:
      return 'slate' as const
  }
}

function getMutationMessage(mutation?: string) {
  if (mutation === 'package-imported') {
    return 'Assessment package imported successfully.'
  }

  return null
}

export function AdminAssessmentVersionDetailSurface({
  detailData,
  version,
  mode = 'detail',
  mutation,
}: {
  detailData: AdminAssessmentDetailData
  version: AdminAssessmentVersionRecord
  mode?: 'detail' | 'import'
  mutation?: string
}) {
  const flashMessage = getMutationMessage(mutation)
  const activity = detailData.activity.filter((event) => event.entityId === version.id || event.entityId === detailData.assessment.id).slice(0, 8)
  const packageInfo = version.packageInfo
  const packageSummary = packageInfo.summary
  const publishReady = packageInfo.status === 'valid' || packageInfo.status === 'valid_with_warnings'

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessment version"
        title={`${detailData.assessment.name} · v${version.versionLabel}`}
        description={mode === 'import'
          ? 'Attach a structured Sonartra assessment package to this draft version, validate it, and persist the canonical payload used for later publish.'
          : 'Version package status, provenance, summary metrics, and publish gating state for the controlled assessment import workflow.'}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/assessments/${detailData.assessment.id}?tab=versions`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to versions</Button>
            {mode === 'detail' ? <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}/import`} variant="secondary"><FileJson2 className="mr-2 h-4 w-4" />Import package</Button> : null}
            <Button href={buildAdminAuditHref({ entityType: 'assessment_version', entityId: version.id })} variant="ghost"><Activity className="mr-2 h-4 w-4" />View audit</Button>
          </div>
        )}
      />

      {flashMessage ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-100">{flashMessage}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Package state</p>
          <div className="mt-3"><Badge label={getAssessmentPackageStatusLabel(packageInfo.status)} tone={getPackageTone(packageInfo.status)} /></div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{publishReady ? 'Publish requirements satisfied.' : 'Publish remains blocked until a valid package is attached.'}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Schema version</p>
          <p className="mt-3 text-lg font-semibold text-textPrimary">{packageInfo.schemaVersion ?? 'None'}</p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">Forward-compatible storage for later package schema revisions.</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Imported at</p>
          <p className="mt-3 text-lg font-semibold text-textPrimary">{packageInfo.importedAt ? formatAdminTimestamp(packageInfo.importedAt) : 'Not imported'}</p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{packageInfo.importedByName ? `Imported by ${packageInfo.importedByName}.` : 'No package provenance recorded yet.'}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Package summary</p>
          <p className="mt-3 text-lg font-semibold text-textPrimary">{packageSummary ? `${packageSummary.questionsCount} questions` : 'No package'}</p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{packageSummary ? `${packageSummary.dimensionsCount} dimensions · ${packageSummary.optionsCount} options · ${packageSummary.outputRuleCount} output rules.` : 'Summary metrics populate after the first import.'}</p>
        </div>
      </div>

      <SurfaceSection
        title="Version package state"
        eyebrow="Definition package"
        description="Stored package provenance, validation outcome, summary counts, and future compatibility slotting for this version."
        actions={mode === 'detail' ? <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${version.versionLabel}/import`} variant="secondary">Re-import package</Button> : null}
      >
        <MetaGrid
          columns={4}
          items={[
            { label: 'Lifecycle', value: version.lifecycleStatus },
            { label: 'Package state', value: getAssessmentPackageStatusLabel(packageInfo.status) },
            { label: 'Schema version', value: packageInfo.schemaVersion ?? 'None' },
            { label: 'Source type', value: packageInfo.sourceType ?? 'None' },
            { label: 'Imported by', value: packageInfo.importedByName ?? 'Unknown' },
            { label: 'Source filename', value: packageInfo.sourceFilename ?? 'Not supplied' },
            { label: 'Imported at', value: formatAdminTimestamp(packageInfo.importedAt) },
            { label: 'Publish readiness', value: publishReady ? 'Ready (warnings allowed)' : 'Blocked' },
            { label: 'Dimensions', value: packageSummary ? String(packageSummary.dimensionsCount) : '0' },
            { label: 'Questions', value: packageSummary ? String(packageSummary.questionsCount) : '0' },
            { label: 'Options', value: packageSummary ? String(packageSummary.optionsCount) : '0' },
            { label: 'Compatibility checks', value: 'Reserved', hint: 'Future compiler signatures and runtime compatibility evidence will surface here.' },
          ]}
        />
      </SurfaceSection>

      {mode === 'import' ? (
        <SurfaceSection
          title="Import assessment package"
          eyebrow="Draft-only workflow"
          description="Paste or upload a package spec v1 JSON payload. Validation runs before the normalized payload is attached to the draft version."
        >
          {version.lifecycleStatus === 'draft'
            ? <AdminAssessmentVersionPackageImportForm assessmentId={detailData.assessment.id} version={version} />
            : <EmptyState title="Import unavailable" detail="Published and archived versions are immutable. Create or reopen a draft version before importing a package." />}
        </SurfaceSection>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceSection title="Validation evidence" eyebrow="Errors + warnings" description="Compact, actionable validation output from the stored package validation report.">
          {packageInfo.errors.length || packageInfo.warnings.length ? (
            <div className="space-y-3">
              {packageInfo.errors.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Errors</p>
                  <ul className="mt-2 space-y-2">
                    {packageInfo.errors.map((issue) => (
                      <li key={`${issue.path}-${issue.message}`} className="rounded-2xl border border-rose-400/15 bg-rose-400/[0.05] px-4 py-3 text-sm leading-6 text-rose-100"><span className="font-medium">{issue.path}</span> · {issue.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {packageInfo.warnings.length ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Warnings</p>
                  <ul className="mt-2 space-y-2">
                    {packageInfo.warnings.map((issue) => (
                      <li key={`${issue.path}-${issue.message}`} className="rounded-2xl border border-amber-400/15 bg-amber-400/[0.05] px-4 py-3 text-sm leading-6 text-amber-100"><span className="font-medium">{issue.path}</span> · {issue.message}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState title="No validation issues stored" detail="Import a package to see validation findings and future compatibility checks here." />
          )}
        </SurfaceSection>

        <SurfaceSection title="Recent version activity" eyebrow="Audit trail" description="Package imports, validation failures, replacements, and publish-blocked events stay aligned with the shared admin audit model.">
          {activity.length ? (
            <Table
              columns={["Timestamp", "Event", "Actor", "Summary"]}
              rows={activity.map((event) => [
                <div key={`${event.id}-timestamp`} className="space-y-1">
                  <p className="text-sm font-medium text-textPrimary">{formatAdminTimestamp(event.happenedAt)}</p>
                  <p className="text-xs text-textSecondary">{formatAdminRelativeTime(event.happenedAt)}</p>
                </div>,
                <div key={`${event.id}-event`} className="space-y-2">
                  <Badge label={getAdminAuditEventLabel(event.eventType)} tone={getAdminAuditEventTone(event.eventType, event.source)} />
                  <p className="text-xs text-textSecondary">{event.eventType}</p>
                </div>,
                <div key={`${event.id}-actor`} className="text-sm text-textPrimary">{event.actorName ?? 'System'}</div>,
                <div key={`${event.id}-summary`} className="text-sm leading-6 text-textPrimary">{event.summary}</div>,
              ])}
            />
          ) : (
            <EmptyState title="No activity yet" detail="Import and lifecycle events for this version will appear here once they are recorded." />
          )}
        </SurfaceSection>
      </div>
    </div>
  )
}
