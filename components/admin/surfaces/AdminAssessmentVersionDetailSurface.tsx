import React from 'react'
import dynamic from 'next/dynamic'
import { Activity, FlaskConical } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminAssessmentVersionPackageImportForm } from '@/components/admin/surfaces/AdminAssessmentVersionPackageImportForm'
import { Badge, EmptyState, MetaGrid, SurfaceSection, Table } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import type { AdminAssessmentDetailData, AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import { buildAdminAuditHref } from '@/lib/admin/domain/audit'
import {
  getAdminAssessmentPackagePreviewSummary,
  getAdminAssessmentVersionReadiness,
} from '@/lib/admin/domain/assessment-package-review'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

function getReadinessTone(status: 'ready' | 'ready_with_warnings' | 'not_ready') {
  switch (status) {
    case 'ready':
      return 'emerald' as const
    case 'ready_with_warnings':
      return 'amber' as const
    default:
      return 'rose' as const
  }
}

function getMutationMessage(mutation?: string) {
  if (mutation === 'package-imported') {
    return 'Assessment package uploaded successfully.'
  }

  return null
}

function normalizeVersionForDisplay(version: AdminAssessmentVersionRecord): AdminAssessmentVersionRecord {
  const packageInfo = version.packageInfo ?? {
    status: 'missing' as const,
    schemaVersion: null,
    sourceType: null,
    importedAt: null,
    importedByName: null,
    sourceFilename: null,
    summary: null,
    errors: [],
    warnings: [],
  }

  return {
    ...version,
    packageInfo: {
      status: packageInfo.status,
      schemaVersion: packageInfo.schemaVersion ?? null,
      sourceType: packageInfo.sourceType ?? null,
      importedAt: packageInfo.importedAt ?? null,
      importedByName: packageInfo.importedByName ?? null,
      sourceFilename: packageInfo.sourceFilename ?? null,
      summary: packageInfo.summary ?? null,
      errors: Array.isArray(packageInfo.errors) ? packageInfo.errors : [],
      warnings: Array.isArray(packageInfo.warnings) ? packageInfo.warnings : [],
    },
    savedScenarios: Array.isArray(version.savedScenarios) ? version.savedScenarios : [],
    latestSuiteSnapshot: version.latestSuiteSnapshot ?? null,
    releaseGovernance: version.releaseGovernance
      ? {
          readinessStatus: version.releaseGovernance.readinessStatus,
          readinessSummary: version.releaseGovernance.readinessSummary ?? null,
          lastReadinessEvaluatedAt: version.releaseGovernance.lastReadinessEvaluatedAt ?? null,
          signOff: version.releaseGovernance.signOff ?? { status: 'unsigned', signedOffBy: null, signedOffAt: null, isStale: false, staleReason: null },
          releaseNotes: version.releaseGovernance.releaseNotes ?? null,
        }
      : undefined,
  }
}

function formatLifecycleStatus(status: AdminAssessmentVersionRecord['lifecycleStatus']) {
  switch (status) {
    case 'published':
      return 'Published'
    case 'archived':
      return 'Archived'
    default:
      return 'Draft'
  }
}

function getReadyToPublishLabel(status: 'ready' | 'ready_with_warnings' | 'not_ready') {
  return status === 'not_ready' ? 'No' : 'Yes'
}

function formatActivityLabel(summary: string) {
  const normalized = summary.toLowerCase()

  if (normalized.includes('package imported')) return 'Package uploaded'
  if (normalized.includes('readiness')) return 'Readiness checked'
  if (normalized.includes('published')) return 'Version published'
  if (normalized.includes('release notes')) return 'Release notes updated'

  return summary
}

const AdminAssessmentVersionReleaseControls = dynamic(() => import('@/components/admin/surfaces/AdminAssessmentVersionReleaseControls').then((module) => module.AdminAssessmentVersionReleaseControls), { ssr: false })

function EvidenceList({ items, tone }: { items: string[]; tone: 'rose' | 'amber' }) {
  if (!items.length) {
    return null
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${tone === 'rose' ? 'border-rose-400/15 bg-rose-400/[0.05] text-rose-100' : 'border-amber-400/15 bg-amber-400/[0.05] text-amber-100'}`}>
          {item}
        </li>
      ))}
    </ul>
  )
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
  const safeVersion = normalizeVersionForDisplay(version)
  const flashMessage = getMutationMessage(mutation)
  const activity = (Array.isArray(detailData.activity) ? detailData.activity : [])
    .filter((event) => event.entityId === safeVersion.id || event.entityId === detailData.assessment.id)
    .slice(0, 3)
  const packageInfo = safeVersion.packageInfo
  const preview = getAdminAssessmentPackagePreviewSummary(safeVersion)
  const readiness = getAdminAssessmentVersionReadiness(safeVersion)
  const releaseGovernance = safeVersion.releaseGovernance ?? {
    readinessStatus: readiness.status,
    readinessSummary: null,
    lastReadinessEvaluatedAt: null,
    signOff: { status: 'unsigned' as const, signedOffBy: null, signedOffAt: null, isStale: false, staleReason: null },
    releaseNotes: null,
  }
  const issues = [
    ...readiness.blockingIssues,
    ...packageInfo.errors.map((issue) => `${issue.path} · ${issue.message}`),
    ...packageInfo.warnings.map((issue) => `${issue.path} · ${issue.message}`),
  ]
  const summaryItems = [
    { label: 'Status', value: formatLifecycleStatus(safeVersion.lifecycleStatus) },
    { label: 'Ready to publish', value: getReadyToPublishLabel(readiness.status) },
    { label: 'Last updated', value: formatAdminTimestamp(safeVersion.updatedAt) },
    {
      label: 'Summary',
      value: packageInfo.summary
        ? `${preview.metrics.questionsCount} questions · ${preview.metrics.dimensionsCount} dimensions`
        : 'No package uploaded',
    },
  ]

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessment version"
        title={`${detailData.assessment.name} · v${safeVersion.versionLabel}`}
        description="Review this version before publishing."
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/assessments/${detailData.assessment.id}?tab=versions`} variant="ghost">← Back to versions</Button>
            <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/simulate`} variant="secondary"><FlaskConical className="mr-2 h-4 w-4" />Run test</Button>
            <Button href={buildAdminAuditHref({ entityType: 'assessment_version', entityId: safeVersion.id })} variant="ghost"><Activity className="mr-2 h-4 w-4" />View audit</Button>
          </div>
        )}
      />

      {flashMessage ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-100">{flashMessage}</div> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryItems.map((item) => (
          <div key={item.label} className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
            <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">{item.label}</p>
            <p className="mt-3 text-lg font-semibold text-textPrimary">{item.value}</p>
          </div>
        ))}
      </div>

      <SurfaceSection
        title="Version actions"
        description="Use these steps to test, check, and publish this version."
      >
        <div className="space-y-4">
          <div className="grid gap-4 xl:grid-cols-3">
            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <p className="text-base font-semibold text-textPrimary">Test assessment</p>
              <p className="mt-2 text-sm leading-6 text-textSecondary">Try sample responses and preview the results.</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold text-textPrimary">Check readiness</p>
                <Badge label={readiness.status === 'not_ready' ? 'Not ready' : readiness.status === 'ready_with_warnings' ? 'Ready with notes' : 'Ready'} tone={getReadinessTone(readiness.status)} />
              </div>
              <p className="mt-2 text-sm leading-6 text-textSecondary">Confirm this version is ready to go live.</p>
              <p className="mt-3 text-sm leading-6 text-textPrimary">{readiness.status === 'not_ready' ? 'This version is not ready yet.' : readiness.status === 'ready_with_warnings' ? 'This version is ready, with a few items to review.' : 'This version is ready to publish.'}</p>
              {readiness.blockingIssues.length ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Issues to fix before publishing</p>
                  <EvidenceList items={readiness.blockingIssues} tone="rose" />
                </div>
              ) : null}
              {!readiness.blockingIssues.length && readiness.warnings.length ? (
                <div className="mt-3 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Items to review</p>
                  <EvidenceList items={readiness.warnings} tone="amber" />
                </div>
              ) : null}
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <p className="text-base font-semibold text-textPrimary">Publish version</p>
              <p className="mt-2 text-sm leading-6 text-textSecondary">Make this version live for users.</p>
              <p className="mt-3 text-sm leading-6 text-textPrimary">
                {readiness.status === 'not_ready'
                  ? 'Publishing stays blocked until the issues above are fixed.'
                  : releaseGovernance.signOff.status === 'signed_off'
                    ? 'This version can be published with the current approval on file.'
                    : 'Publishing will use the current readiness rules.'}
              </p>
            </div>
          </div>

          <AdminAssessmentVersionReleaseControls assessmentId={detailData.assessment.id} version={safeVersion} />
        </div>
      </SurfaceSection>

      <SurfaceSection
        title="Package summary"
        description="Basic information about this version."
      >
        {preview.state === 'missing' ? (
          <EmptyState title="No package uploaded" detail="Upload a package from the import page to review this version." />
        ) : (
          <MetaGrid
            columns={2}
            items={[
              { label: 'Questions', value: String(preview.metrics.questionsCount) },
              { label: 'Dimensions', value: String(preview.metrics.dimensionsCount) },
              { label: 'Imported by', value: packageInfo.importedByName ?? 'Unknown' },
              { label: 'Imported on', value: formatAdminTimestamp(packageInfo.importedAt) },
              ...(packageInfo.sourceFilename ? [{ label: 'Filename', value: packageInfo.sourceFilename }] : []),
            ]}
          />
        )}
      </SurfaceSection>

      {issues.length ? (
        <SurfaceSection title="Issues" description="These items need attention before publishing.">
          <div className="space-y-4">
            {readiness.blockingIssues.length ? <EvidenceList items={readiness.blockingIssues} tone="rose" /> : null}
            {packageInfo.errors.length ? <EvidenceList items={packageInfo.errors.map((issue) => `${issue.path} · ${issue.message}`)} tone="rose" /> : null}
            {readiness.warnings.length || packageInfo.warnings.length ? (
              <EvidenceList items={[...readiness.warnings, ...packageInfo.warnings.map((issue) => `${issue.path} · ${issue.message}`)]} tone="amber" />
            ) : null}
          </div>
        </SurfaceSection>
      ) : null}

      <SurfaceSection title="Internal notes" description="Optional notes for your team.">
        <AdminAssessmentVersionReleaseControls assessmentId={detailData.assessment.id} version={safeVersion} mode="notes" />
      </SurfaceSection>


      {mode === 'import' ? (
        <SurfaceSection
          title="Import assessment package"
          description="Upload a package for this draft version."
        >
          {safeVersion.lifecycleStatus === 'draft'
            ? <AdminAssessmentVersionPackageImportForm assessmentId={detailData.assessment.id} version={safeVersion} />
            : <EmptyState title="Import unavailable" detail="Published and archived versions cannot accept a new package." />}
        </SurfaceSection>
      ) : null}

      <details className="rounded-[1.25rem] border border-white/[0.08] bg-panel/40 p-5">
        <summary className="cursor-pointer list-none text-base font-semibold text-textPrimary">Recent activity</summary>
        <p className="mt-2 text-sm leading-6 text-textSecondary">Latest updates for this version.</p>
        <div className="mt-4">
          {activity.length ? (
            <Table
              columns={['When', 'Activity', 'By']}
              rows={activity.map((event) => [
                <div key={`${event.id}-timestamp`} className="space-y-1">
                  <p className="text-sm font-medium text-textPrimary">{formatAdminTimestamp(event.happenedAt)}</p>
                  <p className="text-xs text-textSecondary">{formatAdminRelativeTime(event.happenedAt)}</p>
                </div>,
                <div key={`${event.id}-summary`} className="text-sm leading-6 text-textPrimary">{formatActivityLabel(event.summary)}</div>,
                <div key={`${event.id}-actor`} className="text-sm text-textPrimary">{event.actorName ?? 'System'}</div>,
              ])}
            />
          ) : (
            <EmptyState title="No activity yet" detail="Recent changes for this version will appear here." />
          )}
        </div>
      </details>
    </div>
  )
}
