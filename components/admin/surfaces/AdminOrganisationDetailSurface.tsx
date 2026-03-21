import React from 'react'
import { Activity, Archive, PencilLine } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import {
  Badge,
  EmptyState,
  MetaGrid,
  MetaPanel,
  MetricCard,
  StatusBadge,
  SurfaceSection,
  Table,
  Tabs,
} from '@/components/admin/surfaces/AdminWireframePrimitives'
import { AdminOrganisationMembersManager } from '@/components/admin/surfaces/AdminOrganisationMembersManager'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import {
  getAdminOrganisationClassificationLabel,
  getAdminOrganisationDetailTab,
  getAssessmentPublishStateLabel,
  type AdminOrganisationActivityRecord,
  type AdminOrganisationDetailData,
  type AdminOrganisationDetailTab,
} from '@/lib/admin/domain/organisation-detail'
import {
  filterAdminOrganisationMembers,
  type AdminOrganisationMemberFilters,
} from '@/lib/admin/domain/organisation-memberships'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

function getTabHref(organisationId: string, tab: AdminOrganisationDetailTab): string {
  return tab === 'overview'
    ? `/admin/organisations/${organisationId}`
    : `/admin/organisations/${organisationId}?tab=${tab}`
}

function getActivityTone(eventType: string) {
  if (/invite|pending/i.test(eventType)) {
    return 'amber' as const
  }

  if (/flag|suspend|archive|deactiv/i.test(eventType)) {
    return 'rose' as const
  }

  if (/sign_in|checkpoint|review|confirm|created|joined|reactivat/i.test(eventType)) {
    return 'sky' as const
  }

  return 'slate' as const
}

function getFlashMessage(mutation?: string | null): string | null {
  switch (mutation) {
    case 'updated':
      return 'Organisation changes saved successfully.'
    case 'deactivated':
      return 'Organisation moved to the suspended lifecycle state.'
    case 'reactivated':
      return 'Organisation restored to an active lifecycle state.'
    case 'member-added':
      return 'Organisation membership created successfully.'
    case 'member-invited':
      return 'Invitation recorded successfully. No email has been sent from this admin surface yet.'
    case 'member-role-updated':
      return 'Organisation membership role updated successfully.'
    case 'member-suspended':
      return 'Organisation membership suspended successfully.'
    case 'member-restored':
      return 'Organisation membership restored successfully.'
    case 'member-removed':
      return 'Organisation membership removed without deleting the underlying user.'
    default:
      return null
  }
}

function ActivityList({ activity, emptyCopy }: { activity: AdminOrganisationActivityRecord[]; emptyCopy: string }) {
  if (!activity.length) {
    return (
      <EmptyState
        title="No organisation-scoped activity is available"
        detail={emptyCopy}
      />
    )
  }

  return (
    <div className="space-y-3">
      {activity.map((event) => (
        <div key={event.id} className="rounded-2xl border border-white/[0.07] bg-bg/55 px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={event.eventType.replace(/_/g, ' ')} tone={getActivityTone(event.eventType)} />
            <Badge label={event.source} tone="slate" />
            <span className="text-xs text-textSecondary">{event.actorName ?? 'System'}</span>
            <span className="text-xs text-textSecondary">{formatAdminTimestamp(event.happenedAt)}</span>
          </div>
          <p className="mt-3 text-sm leading-6 text-textPrimary">{event.summary}</p>
        </div>
      ))}
    </div>
  )
}

function HeaderMetadata({ detailData }: { detailData: AdminOrganisationDetailData }) {
  const { organisation } = detailData
  const lifecycleHref = organisation.status === 'suspended'
    ? `/admin/organisations/${organisation.id}/edit`
    : `/admin/organisations/${organisation.id}/edit`

  return (
    <Card className="px-6 py-5 sm:px-7 sm:py-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={organisation.slug} tone="slate" className="max-w-full" />
            <StatusBadge status={organisation.status} />
            <Badge label={getAdminOrganisationClassificationLabel(organisation.classification)} tone={organisation.classification === 'internal' ? 'violet' : organisation.classification === 'external' ? 'sky' : 'slate'} />
          </div>
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-textSecondary">
            <span>Created {formatAdminTimestamp(organisation.createdAt)}</span>
            <span>Updated {formatAdminTimestamp(organisation.updatedAt)}</span>
            <span>Recent activity {formatAdminRelativeTime(organisation.lastOperationalActivityAt)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href={`/admin/organisations/${organisation.id}/edit`} variant="secondary">
            <PencilLine className="mr-2 h-4 w-4" />
            Edit organisation
          </Button>
          <Button href={lifecycleHref} variant="ghost">
            <Archive className="mr-2 h-4 w-4" />
            {organisation.status === 'suspended' ? 'Restore lifecycle' : 'Deactivate organisation'}
          </Button>
          <Button href={getTabHref(organisation.id, 'activity')} variant="ghost">
            <Activity className="mr-2 h-4 w-4" />
            View audit trail
          </Button>
        </div>
      </div>
    </Card>
  )
}

function OverviewTab({ detailData }: { detailData: AdminOrganisationDetailData }) {
  const { organisation, recentActivity } = detailData

  return (
    <div className="space-y-4">
      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard
          label="Total members"
          value={String(organisation.totalMembers).padStart(2, '0')}
          detail="Directory memberships currently attached to this organisation across active, invited, and inactive access states."
        />
        <MetricCard
          label="Active members"
          value={String(organisation.activeMembers).padStart(2, '0')}
          detail="Members with live organisation access able to enter the workspace and use assigned capabilities."
        />
        <MetricCard
          label="Assigned assessments"
          value={String(organisation.assignedAssessments).padStart(2, '0')}
          detail="Assessment records linked to the organisation in the current persistence model."
        />
        <MetricCard
          label="Completed assessments"
          value={String(organisation.completedAssessments).padStart(2, '0')}
          detail="Completed assessment records derived from the organisation’s existing assessment activity."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceSection
          title="Organisation summary"
          eyebrow="Overview"
          description="High-signal summary of tenant identity, lifecycle posture, operational activity, and safe system metadata."
        >
          <MetaGrid
            items={[
              { label: 'Organisation name', value: organisation.name },
              { label: 'Slug', value: organisation.slug },
              { label: 'Lifecycle status', value: organisation.status.replace(/_/g, ' ') },
              { label: 'Classification', value: getAdminOrganisationClassificationLabel(organisation.classification) },
              { label: 'Country', value: organisation.country ?? 'Not set' },
              { label: 'Plan tier', value: organisation.planTier ?? 'Not set' },
              { label: 'Seat band', value: organisation.seatBand ?? 'Not set' },
              { label: 'Linked workspace identifiers', value: 'No additional linked workspace identifiers in schema' },
              { label: 'Last membership activity', value: formatAdminTimestamp(organisation.lastMembershipActivityAt) },
              { label: 'Last assessment activity', value: formatAdminTimestamp(organisation.lastAssessmentActivityAt) },
              { label: 'Last audit activity', value: formatAdminTimestamp(organisation.lastAuditActivityAt) },
              { label: 'Operational activity', value: formatAdminTimestamp(organisation.lastOperationalActivityAt) },
            ]}
          />
        </SurfaceSection>

        <MetaPanel
          title="Recent activity"
          items={recentActivity.length
            ? recentActivity.map((event) => ({
                label: formatAdminTimestamp(event.happenedAt),
                value: (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={event.eventType.replace(/_/g, ' ')} tone={getActivityTone(event.eventType)} />
                      <Badge label={event.source} tone="slate" />
                      <span className="text-xs text-textSecondary">{event.actorName ?? 'System'}</span>
                    </div>
                    <p className="text-sm leading-6 text-textPrimary">{event.summary}</p>
                  </div>
                ),
              }))
            : [{
                label: 'Recent activity',
                value: 'No organisation-scoped audit events are available yet. This panel will populate when the audit model records tenant events.',
              }]}
          footer={<p className="text-xs leading-5 text-textSecondary">Open the activity tab to review scoped audit, lifecycle, and derived membership events for this organisation.</p>}
        />
      </div>
    </div>
  )
}

function MembersTab({ detailData, filters }: { detailData: AdminOrganisationDetailData; filters: AdminOrganisationMemberFilters }) {
  const filteredMembers = filterAdminOrganisationMembers(detailData.members, filters)

  return (
    <AdminOrganisationMembersManager
      organisationId={detailData.organisation.id}
      organisationName={detailData.organisation.name}
      members={filteredMembers}
      filters={filters}
    />
  )
}

function AssessmentsTab({ detailData }: { detailData: AdminOrganisationDetailData }) {
  const { assessments } = detailData

  return (
    <SurfaceSection
      title="Assessments"
      eyebrow="Assessment activity"
      description="Assessment activity derived from organisation-linked assessment records. Dedicated organisation-assignment controls are not yet modelled in the current schema."
      actions={<Button href="/admin/assessments" variant="ghost">Open assessments registry</Button>}
    >
      {assessments.length ? (
        <Table
          columns={["Assessment", "Library key", "Publish state", "Assigned users", "Completion count", "Updated"]}
          rows={assessments.map((assessment) => [
            <div key={`${assessment.assessmentVersionId}-title`} className="space-y-1">
              <p className="text-sm font-semibold text-textPrimary">{assessment.title}</p>
              <p className="text-xs text-textSecondary">Assessment detail linking is deferred until registry routes are aligned to database-backed assessment identifiers.</p>
            </div>,
            <div key={`${assessment.assessmentVersionId}-library`}>
              <Badge label={assessment.libraryKey} tone="slate" className="max-w-full" />
            </div>,
            <div key={`${assessment.assessmentVersionId}-publish`}>
              <Badge label={getAssessmentPublishStateLabel(assessment.publishState)} tone={assessment.publishState === 'published' ? 'emerald' : 'slate'} />
            </div>,
            <div key={`${assessment.assessmentVersionId}-assigned`} className="text-sm font-medium text-textPrimary">
              {assessment.assignedUsersCount}
            </div>,
            <div key={`${assessment.assessmentVersionId}-completed`} className="text-sm font-medium text-textPrimary">
              {assessment.completionCount}
            </div>,
            <div key={`${assessment.assessmentVersionId}-updated`} className="space-y-1">
              <p className="text-sm font-medium text-textPrimary">{formatAdminRelativeTime(assessment.updatedAt)}</p>
              <p className="text-xs text-textSecondary">{formatAdminTimestamp(assessment.updatedAt)}</p>
            </div>,
          ])}
        />
      ) : (
        <EmptyState
          title="No assessments are connected yet"
          detail="No organisation-linked assessment records were found. This page stays truthful until dedicated organisation-assignment metadata is introduced."
        />
      )}
    </SurfaceSection>
  )
}

function ActivityTab({ detailData }: { detailData: AdminOrganisationDetailData }) {
  return (
    <SurfaceSection
      title="Organisation audit trail"
      eyebrow="Scoped activity"
      description="Audit, lifecycle, creation, and derived membership events filtered to the selected organisation."
      actions={<Button href="/admin/audit" variant="ghost">Open shared audit workspace</Button>}
    >
      <ActivityList
        activity={detailData.auditTrail}
        emptyCopy="The current audit model has not yet produced organisation-scoped events for this record."
      />
    </SurfaceSection>
  )
}

function SettingsTab({ detailData }: { detailData: AdminOrganisationDetailData }) {
  const { organisation } = detailData

  return (
    <div className="space-y-4">
      <SurfaceSection
        title="Organisation settings"
        eyebrow="Read-only metadata"
        description="Safe admin metadata for support, lifecycle review, and future organisation-level provisioning controls."
      >
        <MetaGrid
          columns={4}
          items={[
            { label: 'Organisation ID', value: organisation.id },
            { label: 'Slug', value: organisation.slug },
            { label: 'Status', value: organisation.status.replace(/_/g, ' ') },
            { label: 'Classification', value: getAdminOrganisationClassificationLabel(organisation.classification) },
            { label: 'Country', value: organisation.country ?? 'Not set' },
            { label: 'Plan tier', value: organisation.planTier ?? 'Not set' },
            { label: 'Seat band', value: organisation.seatBand ?? 'Not set' },
            { label: 'Created at', value: formatAdminTimestamp(organisation.createdAt) },
            { label: 'Updated at', value: formatAdminTimestamp(organisation.updatedAt) },
            { label: 'Active members', value: String(organisation.activeMembers) },
            { label: 'Invited members', value: String(organisation.invitedMembers) },
            { label: 'Inactive members', value: String(organisation.inactiveMembers) },
          ]}
        />
      </SurfaceSection>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-sm font-semibold text-textPrimary">Default assessment access</p>
          <p className="mt-2 text-sm leading-6 text-textSecondary">Reserved for future policy controls covering default assessment enablement, rollout defaults, and access posture per tenant.</p>
        </Card>
        <Card className="px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-sm font-semibold text-textPrimary">Organisation branding</p>
          <p className="mt-2 text-sm leading-6 text-textSecondary">Reserved surface for logo, domain, and presentation settings once tenant branding enters the admin control model.</p>
        </Card>
        <Card className="px-5 py-5 sm:px-6 sm:py-6">
          <p className="text-sm font-semibold text-textPrimary">Provisioning options</p>
          <p className="mt-2 text-sm leading-6 text-textSecondary">Reserved for future workspace provisioning, tenant bootstrap flags, and internal support controls.</p>
        </Card>
      </div>
    </div>
  )
}

export function AdminOrganisationDetailSurface({
  detailData,
  activeTab = 'overview',
  mutation,
  memberFilters = { search: '', role: 'all', status: 'all' },
}: {
  detailData: AdminOrganisationDetailData
  activeTab?: AdminOrganisationDetailTab
  mutation?: string | null
  memberFilters?: AdminOrganisationMemberFilters
}) {
  const resolvedTab = getAdminOrganisationDetailTab(activeTab)
  const { organisation } = detailData
  const flashMessage = getFlashMessage(mutation)
  const tabItems = [
    { label: 'Overview', href: getTabHref(organisation.id, 'overview'), current: resolvedTab === 'overview' },
    { label: 'Members', href: getTabHref(organisation.id, 'members'), current: resolvedTab === 'members', count: detailData.members.length },
    { label: 'Assessments', href: getTabHref(organisation.id, 'assessments'), current: resolvedTab === 'assessments', count: detailData.assessments.length },
    { label: 'Activity', href: getTabHref(organisation.id, 'activity'), current: resolvedTab === 'activity', count: detailData.auditTrail.length },
    { label: 'Settings', href: getTabHref(organisation.id, 'settings'), current: resolvedTab === 'settings' },
  ]

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Organisation detail"
        title={organisation.name}
        description="Enterprise admin workspace for membership posture, assessment activity, audit visibility, and safe organisation metadata."
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={organisation.status} />
            <Button href="/admin/organisations" variant="ghost">Back to registry</Button>
          </div>
        }
      />

      {flashMessage ? (
        <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] px-5 py-4 text-sm text-emerald-100">
          {flashMessage}
        </div>
      ) : null}

      <HeaderMetadata detailData={detailData} />

      <div className="flex flex-wrap items-center gap-3">
        <Tabs items={tabItems} />
        <div className="flex flex-wrap gap-2 text-xs text-textSecondary">
          <Badge label={`Org ID ${organisation.id.slice(0, 8)}`} tone="slate" />
          <Badge label={`${detailData.members.length} members`} tone="slate" />
          <Badge label={`${detailData.assessments.length} assessment lines`} tone="slate" />
        </div>
      </div>

      {resolvedTab === 'overview' ? <OverviewTab detailData={detailData} /> : null}
      {resolvedTab === 'members' ? <MembersTab detailData={detailData} filters={memberFilters} /> : null}
      {resolvedTab === 'assessments' ? <AssessmentsTab detailData={detailData} /> : null}
      {resolvedTab === 'activity' ? <ActivityTab detailData={detailData} /> : null}
      {resolvedTab === 'settings' ? <SettingsTab detailData={detailData} /> : null}
    </div>
  )
}
