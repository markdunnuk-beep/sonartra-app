import React from 'react'
import { Activity, PackageCheck } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import {
  Badge,
  EmptyState,
  MetaGrid,
  MetricCard,
  StatusBadge,
  SurfaceSection,
  Table,
  Tabs,
} from '@/components/admin/surfaces/AdminWireframePrimitives'
import { AdminAssessmentVersionsManager } from '@/components/admin/surfaces/AdminAssessmentVersionsManager'
import { Button } from '@/components/ui/Button'
import {
  getAdminAssessmentCategoryLabel,
  getAdminAssessmentDetailTab,
  type AdminAssessmentDetailData,
  type AdminAssessmentDetailTab,
} from '@/lib/admin/domain/assessment-management'
import { buildAdminAuditHref, getAdminAuditEventLabel, getAdminAuditEventTone } from '@/lib/admin/domain/audit'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

function getTabHref(assessmentId: string, tab: AdminAssessmentDetailTab): string {
  return tab === 'overview'
    ? `/admin/assessments/${assessmentId}`
    : `/admin/assessments/${assessmentId}?tab=${tab}`
}

function getFlashMessage(mutation?: string | null): string | null {
  switch (mutation) {
    case 'created':
      return 'Assessment created successfully.'
    case 'version-created':
      return 'Draft version created successfully.'
    case 'version-published':
      return 'Version published and set as the current live version.'
    case 'version-archived':
      return 'Version archived successfully.'
    default:
      return null
  }
}

function OverviewTab({ detailData }: { detailData: AdminAssessmentDetailData }) {
  const { assessment, diagnostics, versions, activity } = detailData

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Versions" value={String(diagnostics.versionCount).padStart(2, '0')} detail="Total version records retained for this assessment line, including historical archived revisions." />
        <MetricCard label="Draft versions" value={String(diagnostics.draftCount).padStart(2, '0')} detail="Draft versions can coexist alongside a published version until one is promoted." />
        <MetricCard label="Published version" value={assessment.currentPublishedVersionLabel ? `v${assessment.currentPublishedVersionLabel}` : 'None'} detail="Single published version pointer stored on the parent assessment record." />
        <MetricCard label="Archived versions" value={String(diagnostics.archivedCount).padStart(2, '0')} detail="Archived versions remain visible historically and are never hard-deleted in this workflow." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceSection
          title="Assessment summary"
          eyebrow="Overview"
          description="Core metadata, lifecycle posture, and forward-compatible operator context for this stable assessment container."
        >
          <MetaGrid
            items={[
              { label: 'Assessment name', value: assessment.name },
              { label: 'Library key', value: assessment.key },
              { label: 'Slug', value: assessment.slug },
              { label: 'Category', value: getAdminAssessmentCategoryLabel(assessment.category) },
              { label: 'Lifecycle', value: assessment.lifecycleStatus },
              { label: 'Current published version', value: assessment.currentPublishedVersionLabel ? `v${assessment.currentPublishedVersionLabel}` : 'None' },
              { label: 'Latest draft version', value: diagnostics.latestDraftVersionLabel ? `v${diagnostics.latestDraftVersionLabel}` : 'None' },
              { label: 'Latest version update', value: formatAdminTimestamp(diagnostics.latestVersionUpdatedAt) },
              { label: 'Import compatibility', value: 'Package spec v1 enabled', hint: 'Draft versions can now import, validate, and retain structured package payloads.' },
              { label: 'Definition payload state', value: versions.some((version) => version.packageInfo.status === 'valid' || version.packageInfo.status === 'valid_with_warnings') ? 'At least one version has a valid attached package' : 'No valid package attached yet' },
              { label: 'Created', value: formatAdminTimestamp(assessment.createdAt) },
              { label: 'Updated', value: formatAdminTimestamp(assessment.updatedAt) },
            ]}
          />
        </SurfaceSection>

        <SurfaceSection
          title="Recent activity"
          eyebrow="Audit-linked view"
          description="Recent assessment-scoped events from the shared audit model. Open the Activity tab for the full local evidence stream."
        >
          <div className="space-y-3">
            {activity.length ? activity.slice(0, 6).map((event) => (
              <div key={event.id} className="rounded-2xl border border-white/[0.07] bg-bg/55 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge label={getAdminAuditEventLabel(event.eventType)} tone={getAdminAuditEventTone(event.eventType, event.source)} />
                  <Badge label={event.entityType === 'assessment_version' ? 'Version' : 'Assessment'} tone="slate" />
                  <span className="text-xs text-textSecondary">{event.actorName ?? 'System'}</span>
                  <span className="text-xs text-textSecondary">{formatAdminTimestamp(event.happenedAt)}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-textPrimary">{event.summary}</p>
              </div>
            )) : (
              <EmptyState title="No activity yet" detail="Assessment-scoped audit rows will appear here as versions are created, published, archived, or metadata changes are recorded." />
            )}
          </div>
        </SurfaceSection>
      </div>
    </div>
  )
}

function SettingsTab({ detailData }: { detailData: AdminAssessmentDetailData }) {
  const { assessment } = detailData

  return (
    <SurfaceSection
      title="Assessment settings"
      eyebrow="Read-mostly metadata"
      description="Safe administrative metadata and reserved future capability slots without pretending backend bindings already exist."
    >
      <MetaGrid
        items={[
          { label: 'Assessment ID', value: assessment.id },
          { label: 'Library key', value: assessment.key },
          { label: 'Slug', value: assessment.slug },
          { label: 'Category', value: getAdminAssessmentCategoryLabel(assessment.category) },
          { label: 'Parent lifecycle', value: assessment.lifecycleStatus },
          { label: 'Current published version ID', value: assessment.currentPublishedVersionId ?? 'None' },
          { label: 'Created', value: formatAdminTimestamp(assessment.createdAt) },
          { label: 'Updated', value: formatAdminTimestamp(assessment.updatedAt) },
          { label: 'Import compatibility', value: 'Enabled', hint: 'Version routes expose package intake, validation output, provenance, and publish gating.' },
          { label: 'Result/report template binding', value: 'Not yet modelled' },
          { label: 'Assignment defaults', value: 'Not yet modelled' },
          { label: 'Definition compiler state', value: 'Package normalization pipeline active for draft imports' },
        ]}
      />
    </SurfaceSection>
  )
}

function ActivityTab({ detailData }: { detailData: AdminAssessmentDetailData }) {
  const auditHref = buildAdminAuditHref({ entityType: 'assessment', entityId: detailData.assessment.id })

  return (
    <SurfaceSection
      title="Assessment activity"
      eyebrow="Shared audit presentation"
      description="Local activity stream uses the same event labels, tones, and evidence conventions as the global admin audit workspace."
      actions={<Button href={auditHref} variant="ghost"><Activity className="mr-2 h-4 w-4" />Open in shared audit</Button>}
    >
      {detailData.activity.length ? (
        <Table
          columns={["Timestamp", "Event", "Actor", "Entity", "Summary"]}
          rows={detailData.activity.map((event) => [
            <div key={`${event.id}-timestamp`} className="space-y-1">
              <p className="text-sm font-medium text-textPrimary">{formatAdminTimestamp(event.happenedAt)}</p>
              <p className="text-xs text-textSecondary">{formatAdminRelativeTime(event.happenedAt)}</p>
            </div>,
            <div key={`${event.id}-event`} className="space-y-2">
              <Badge label={getAdminAuditEventLabel(event.eventType)} tone={getAdminAuditEventTone(event.eventType, event.source)} />
              <p className="text-xs text-textSecondary">{event.eventType}</p>
            </div>,
            <div key={`${event.id}-actor`} className="space-y-1">
              <p className="text-sm font-medium text-textPrimary">{event.actorName ?? 'System'}</p>
              <p className="text-xs text-textSecondary break-all">{event.actorId ?? 'No actor identity recorded'}</p>
            </div>,
            <div key={`${event.id}-entity`} className="space-y-2">
              <Badge label={event.entityType === 'assessment_version' ? 'Assessment version' : 'Assessment'} tone="slate" />
              <p className="text-sm font-medium text-textPrimary">{event.entityName ?? 'Unknown entity'}</p>
              <p className="text-xs text-textSecondary break-all">{event.entitySecondary ?? event.entityId ?? 'Identifier unavailable'}</p>
            </div>,
            <div key={`${event.id}-summary`} className="text-sm leading-6 text-textPrimary">
              {event.summary}
            </div>,
          ])}
        />
      ) : (
        <EmptyState title="No assessment activity is available" detail="Activity will populate once the assessment record or its versions accumulate audit events." action={<Button href={auditHref} variant="secondary">Open shared audit</Button>} />
      )}
    </SurfaceSection>
  )
}

export function AdminAssessmentDetailSurface({
  detailData,
  activeTab = 'overview',
  mutation,
}: {
  detailData: AdminAssessmentDetailData
  activeTab?: AdminAssessmentDetailTab
  mutation?: string
}) {
  const { assessment, versions } = detailData
  const flashMessage = getFlashMessage(mutation)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessments"
        title={assessment.name}
        description={assessment.description ?? 'No internal summary is stored for this assessment yet.'}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button href={getTabHref(assessment.id, 'versions')} variant="secondary"><PackageCheck className="mr-2 h-4 w-4" />Manage versions</Button>
            <Button href={buildAdminAuditHref({ entityType: 'assessment', entityId: assessment.id })} variant="ghost"><Activity className="mr-2 h-4 w-4" />View audit</Button>
          </div>
        )}
      />

      <div className="rounded-[1.5rem] border border-white/[0.08] bg-panel/60 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={assessment.key} tone="slate" className="max-w-full" />
              <Badge label={assessment.slug} tone="slate" className="max-w-full" />
              <StatusBadge status={assessment.lifecycleStatus} />
              <Badge label={getAdminAssessmentCategoryLabel(assessment.category)} tone="sky" />
            </div>
            <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-textSecondary">
              <span>Created {formatAdminTimestamp(assessment.createdAt)}</span>
              <span>Updated {formatAdminTimestamp(assessment.updatedAt)}</span>
              <span>Published version {assessment.currentPublishedVersionLabel ? `v${assessment.currentPublishedVersionLabel}` : 'none'}</span>
            </div>
          </div>
        </div>
      </div>

      {flashMessage ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-100">{flashMessage}</div> : null}

      <Tabs
        items={[
          { label: 'Overview', href: getTabHref(assessment.id, 'overview'), current: activeTab === 'overview' },
          { label: 'Versions', href: getTabHref(assessment.id, 'versions'), current: activeTab === 'versions', count: versions.length },
          { label: 'Settings', href: getTabHref(assessment.id, 'settings'), current: activeTab === 'settings' },
          { label: 'Activity', href: getTabHref(assessment.id, 'activity'), current: activeTab === 'activity', count: detailData.activity.length },
        ]}
      />

      {activeTab === 'overview' ? <OverviewTab detailData={detailData} /> : null}
      {activeTab === 'versions' ? <AdminAssessmentVersionsManager assessmentId={assessment.id} versions={versions} currentPublishedVersionId={assessment.currentPublishedVersionId} /> : null}
      {activeTab === 'settings' ? <SettingsTab detailData={detailData} /> : null}
      {activeTab === 'activity' ? <ActivityTab detailData={detailData} /> : null}
    </div>
  )
}
