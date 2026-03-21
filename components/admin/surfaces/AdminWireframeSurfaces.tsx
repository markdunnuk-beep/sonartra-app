import React from 'react'
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, Clock3, GitBranch } from 'lucide-react'
import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminOrganisationsRegistryClient } from '@/components/admin/surfaces/AdminOrganisationsRegistryClient'
import { AdminUsersAccessRegistryClient } from '@/components/admin/surfaces/AdminUsersAccessRegistryClient'
import { AdminDashboardSurface } from '@/components/admin/dashboard/AdminDashboardSurface'
import {
  Badge,
  EmptyState,
  FilterBar,
  MetaGrid,
  MetaPanel,
  MetricCard,
  PanelActionRow,
  QueueItem,
  ReleaseRail,
  StatusBadge,
  SurfaceSection,
  Table,
  Tabs,
  TimelineItem,
  toneForStatus,
} from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { adminDashboardModel } from '@/lib/admin/dashboard'
import {
  adminUsers,
  assessUserAccessPriority,
  type AdminAccessRegistryDomainData,
  assessmentVersions,
  assessments,
  auditLogEvents,
  getSeatUtilisationPercent,
  getStatusLabel,
  organisations,
} from '@/lib/admin/domain'
import { adminRoleDefinitions } from '@/lib/admin/domain/roles'
import { AssessmentVersionStatus, PublishStatus } from '@/lib/admin/domain/assessments'
import {
  findAssessmentBySlug,
  findAssessmentVersion,
  formatAdminRelativeTime,
  findOrganisationBySlug,
  findUserById,
  formatAdminTimestamp,
  formatShortAdminDate,
  getAssessmentSummary,
  getAssessmentTabs,
  getDashboardPrimaryRelease,
  getKindLabel,
  getOrganisationAuditEvents,
  getOrganisationHealthSignals,
  getOrganisationMembershipSummary,
  getOrganisationSummary,
  getOrganisationUtilisationBand,
  getOrganisationVersionExposure,
  getReleaseBlockers,
  getUserSummary,
  getUserAccessHistory,
  getUserAccessSignals,
  getUserActivityBand,
  getUserRoleSummary,
  getValidationIssues,
  getVersionAuditEvents,
} from '@/lib/admin/wireframe'
import type { AdminValidationIssue } from '@/lib/admin/wireframe'
import type { AssessmentVersion } from '@/lib/admin/domain/assessments'

function ValidationIssueCard({ issue }: { issue: AdminValidationIssue }) {
  const tone = toneForStatus(issue.state)
  const Icon = issue.state === 'pass' ? CheckCircle2 : issue.state === 'warning' ? AlertTriangle : Clock3

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-4">
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl border ${tone === 'emerald' ? 'border-emerald-400/25 bg-emerald-400/[0.08] text-emerald-100' : tone === 'amber' ? 'border-amber-400/25 bg-amber-400/[0.08] text-amber-100' : 'border-rose-400/25 bg-rose-400/[0.08] text-rose-100'}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-textPrimary">{issue.label}</p>
            <Badge label={issue.state} tone={tone} />
          </div>
          <p className="mt-2 text-sm leading-6 text-textSecondary">{issue.detail}</p>
        </div>
      </div>
    </div>
  )
}

function ReadinessBlockers({ blockers }: { blockers: string[] }) {
  return (
    <Card className="px-4 py-4">
      <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Blockers / dependencies</p>
      <div className="mt-3 space-y-2 text-sm text-textSecondary">
        {blockers.length ? (
          blockers.map((blocker) => (
            <div key={blocker} className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2.5 text-rose-100">
              {blocker}
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-3 py-2.5 text-emerald-100">
            No blockers. Release can proceed within the approved window.
          </div>
        )}
      </div>
    </Card>
  )
}

function WorkflowSummaryCards() {
  return (
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <Card className="px-4 py-4">
        <p className="text-sm font-medium text-textPrimary">Structured import bundle</p>
        <p className="mt-2 text-sm text-textSecondary">Bring in a versioned package with schema, questions, scoring, and output definitions.</p>
      </Card>
      <Card className="px-4 py-4">
        <p className="text-sm font-medium text-textPrimary">Duplicate existing asset</p>
        <p className="mt-2 text-sm text-textSecondary">Use a current registry asset as the basis for a new controlled line.</p>
      </Card>
      <Card className="px-4 py-4">
        <p className="text-sm font-medium text-textPrimary">Manual scaffold</p>
        <p className="mt-2 text-sm text-textSecondary">Start with metadata and generate an empty governed draft for later authoring.</p>
      </Card>
    </div>
  )
}

function HealthSignalBadges({ labels }: { labels: Array<{ label: string; tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' }> }) {
  if (!labels.length) {
    return <span className="text-xs text-textSecondary">—</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((signal) => (
        <Badge key={`${signal.label}-${signal.tone}`} label={signal.label} tone={signal.tone} />
      ))}
    </div>
  )
}

function AccessFlagGroup({ labels }: { labels: Array<{ label: string; tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet' }> }) {
  if (!labels.length) {
    return <span className="text-xs text-textSecondary">No flags</span>
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((signal) => (
        <Badge key={`${signal.label}-${signal.tone}`} label={signal.label} tone={signal.tone} />
      ))}
    </div>
  )
}

function UserRoleReferencePanel() {
  const roleDefinitions = Object.values(adminRoleDefinitions)

  return (
    <MetaPanel
      title="Internal role reference"
      items={roleDefinitions.map((definition) => ({
        label: definition.label,
        value: definition.capabilities.map((capability) => capability.split(':')[0]).join(' · '),
        hint: definition.description,
      }))}
      footer={<p className="text-xs leading-5 text-textSecondary">Reference only. Access changes and RBAC editing remain out of scope for this phase.</p>}
    />
  )
}

function getActivityBandLabel(activityBand: ReturnType<typeof getUserActivityBand>): string {
  switch (activityBand) {
    case 'active':
      return 'Active now'
    case 'recent':
      return 'Recent'
    case 'watch':
      return 'Watch'
    case 'inactive':
      return 'Inactive'
    case 'none':
      return 'No activity'
  }
}

export function AdminDashboardWireframePage() {
  const releaseFocus = getDashboardPrimaryRelease()

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminDashboardSurface />

      {releaseFocus ? (
        <SurfaceSection
          eyebrow="System standards"
          title="Operational pattern system anchored to the live dashboard"
          description="These companion patterns extend the dashboard into the shared registry, detail, release, and evidence language used across the admin platform."
          actions={<Button href={`/admin/releases/${releaseFocus.version.id}/publish`} variant="secondary">Open release control</Button>}
        >
          <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="grid gap-3 md:grid-cols-2">
              <QueueItem title="Release progression" detail="Move from validation evidence to publish decision with the same state, blocker, and metadata language used across admin." tone="sky" href={`/admin/releases/${releaseFocus.version.id}/validation`} meta="Validated version" cta="Inspect readiness" />
              <QueueItem title="Tenant operating registry" detail="List and detail pages share a disciplined table/filter/meta-panel structure so organisations and users feel like governed entities." tone="emerald" href="/admin/organisations" meta="Entity registry" cta="Open registry" />
              <QueueItem title="Version lineage view" detail="Assessment detail and version pages preserve the distinction between stable product lines and mutable release candidates." tone="violet" href={`/admin/assessments/${releaseFocus.assessment.slug}`} meta="Controlled assets" cta="Review versions" />
              <QueueItem title="Audit evidence stream" detail="Timeline items, actor metadata, and evidence side-panels are standardised for calm enterprise readability." tone="amber" href="/admin/audit" meta="Evidence model" cta="Open audit" />
            </div>
            <MetaPanel
              title="What was standardised"
              items={[
                { label: 'Density', value: 'Tight but breathable spacing, 12–16px inner rhythm, restrained accent use.' },
                { label: 'Entity hierarchy', value: 'Page headers establish the stable entity first, mutable state second, and actions last.' },
                { label: 'State system', value: 'Badges differentiate status, role, validation, release, and access posture with shared tones.' },
              ]}
            />
          </div>
        </SurfaceSection>
      ) : null}
    </div>
  )
}

export function AdminOrganisationsWireframePage({ organisationRegistryData }: { organisationRegistryData: import('@/lib/admin/domain/organisation-registry').AdminOrganisationRegistryDomainData }) {
  const totalOrganisations = organisationRegistryData.organisations.length
  const activeOrganisations = organisationRegistryData.organisations.filter((entry) => entry.lifecycle === 'active').length
  const dormantOrganisations = organisationRegistryData.organisations.filter((entry) => entry.lifecycle === 'dormant').length
  const flaggedOrganisations = organisationRegistryData.organisations.filter((entry) => entry.lifecycle === 'flagged').length

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Organisations"
        title="Tenant registry"
        description="Operator-facing registry for live tenant posture, lifecycle, membership coverage, and recent operational movement across the estate."
        actions={<Button variant="secondary">Review tenant posture</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Total organisations" value={String(totalOrganisations).padStart(2, '0')} detail="Tracked tenant workspaces currently present in the database-backed registry." />
        <MetricCard label="Active organisations" value={String(activeOrganisations).padStart(2, '0')} detail="Tenants with active operational movement and usable membership coverage." />
        <MetricCard label="Dormant organisations" value={String(dormantOrganisations).padStart(2, '0')} detail="Tenants showing no recent activity signal or no active coverage posture." />
        <MetricCard label="Flagged organisations" value={String(flaggedOrganisations).padStart(2, '0')} detail="Tenants with restricted status, invite-only posture, inactive coverage, or cross-tenant overlap signals." />
      </div>

      <AdminOrganisationsRegistryClient organisationRegistryData={organisationRegistryData} />
    </div>
  )
}

export function AdminOrganisationDetailWireframePage({ slug }: { slug: string }) {
  const organisation = findOrganisationBySlug(slug)

  if (!organisation) {
    return <EmptyState title="Organisation not found" detail="The requested tenant slug is not present in the typed Sonartra admin domain model." action={<Button href="/admin/organisations" variant="secondary">Back to organisations</Button>} />
  }

  const summary = getOrganisationSummary(organisation)
  const membershipSummary = getOrganisationMembershipSummary(organisation)
  const healthSignals = getOrganisationHealthSignals(organisation)
  const versionExposure = getOrganisationVersionExposure(organisation)
  const tenantEvents = getOrganisationAuditEvents(organisation.id)
  const membershipRows = summary.users.map((user) => {
    const membership = summary.memberships.find((item) => item.userId === user.id)

    return [
      <div key={`${user.id}-identity`}>
        <Link href={`/admin/users/${user.id}`} className="text-sm font-semibold text-textPrimary hover:text-accent">
          {user.profile.fullName}
        </Link>
        <p className="mt-1 text-xs text-textSecondary">{user.email}</p>
      </div>,
      <div key={`${user.id}-role`} className="space-y-2">
        {membership ? <StatusBadge status={membership.role} /> : <span className="text-xs text-textSecondary">No role</span>}
        <StatusBadge status={user.status} />
      </div>,
      <div key={`${user.id}-summary`} className="text-sm text-textSecondary">
        {membership?.isBillingContact ? 'Billing' : '—'} · {membership?.isAssessmentContact ? 'Assessment' : '—'}
      </div>,
      <div key={`${user.id}-activity`}>
        <p className="text-sm font-medium text-textPrimary">{formatAdminRelativeTime(user.recentActivity.lastActiveAt)}</p>
        <p className="text-xs text-textSecondary">{formatAdminTimestamp(user.recentActivity.lastActiveAt)}</p>
      </div>,
    ]
  })

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Organisation detail"
        title={organisation.name}
        description="Operational tenant control view for capacity, enablement, membership posture, activity, and intervention signals."
        actions={
          <>
            <StatusBadge status={organisation.status} />
            <Button href="/admin/organisations" variant="ghost">Back to registry</Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="eyebrow">Overview</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge label={getStatusLabel(organisation.plan)} tone="slate" />
            <Badge label={organisation.region} tone="slate" />
            <Badge label={organisation.sector} tone="slate" />
            <HealthSignalBadges labels={healthSignals} />
          </div>
          <div className="mt-5">
            <MetaGrid
              items={[
                { label: 'Status', value: getStatusLabel(organisation.status), hint: `Last activity ${formatAdminRelativeTime(organisation.lastActivityAt)}` },
                { label: 'Plan', value: getStatusLabel(organisation.plan), hint: `${organisation.region} · ${organisation.sector}` },
                { label: 'Workspace', value: organisation.workspaceProvisionedAt ? 'Provisioned' : 'Pending', hint: formatAdminTimestamp(organisation.workspaceProvisionedAt) },
                { label: 'Renewal', value: formatShortAdminDate(organisation.contractRenewalDate), hint: 'Commercial checkpoint' },
              ]}
            />
          </div>
        </Card>

        <MetaPanel
          title="Operator context"
          items={[
            { label: 'Primary contact', value: summary.contact ? `${summary.contact.profile.fullName} · ${summary.contact.email}` : 'Unassigned' },
            { label: 'Enabled assessments', value: summary.enabledProducts.length ? summary.enabledProducts.map((product) => product.label).join(' · ') : 'No active enablement' },
            { label: 'Last activity', value: `${formatAdminRelativeTime(organisation.lastActivityAt)} · ${formatAdminTimestamp(organisation.lastActivityAt)}` },
          ]}
          footer={<Button variant="secondary">Prepare intervention summary</Button>}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <MetaPanel
          title="Seat & usage"
          items={[
            { label: 'Assigned / purchased', value: `${organisation.seatSummary.assigned}/${organisation.seatSummary.purchased}` },
            { label: 'Utilisation', value: `${summary.seatUtilisation}% · ${getStatusLabel(getOrganisationUtilisationBand(organisation))}` },
            { label: 'Seat posture', value: `${organisation.seatSummary.available} available · ${organisation.seatSummary.invited} invited` },
          ]}
        />
        <MetaPanel
          title="Enablement"
          items={[
            { label: 'Products', value: summary.enabledProducts.length ? summary.enabledProducts.map((product) => product.label).join(' · ') : 'No active products' },
            { label: 'Assessments', value: organisation.enabledAssessmentIds.length ? `${organisation.enabledAssessmentIds.length} enabled` : '0 enabled' },
            { label: 'Version exposure', value: versionExposure.length ? versionExposure.join(' · ') : 'No live exposure' },
          ]}
        />
        <MetaPanel
          title="Health signals"
          items={[
            { label: 'Intervention flags', value: healthSignals.length ? <HealthSignalBadges labels={healthSignals} /> : 'No active interventions' },
            { label: 'Dormancy posture', value: formatAdminRelativeTime(organisation.lastActivityAt) },
            { label: 'Seat risk', value: getOrganisationUtilisationBand(organisation) === 'low' ? 'Review adoption and seat fit' : 'Within expected range' },
          ]}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceSection title="Membership summary" eyebrow="Access summary" description="Tenant users, roles, and access posture in one compact surface.">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Total users</p>
              <p className="mt-2 text-2xl font-semibold text-textPrimary">{membershipSummary.totalUsers}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Admins</p>
              <p className="mt-2 text-2xl font-semibold text-textPrimary">{membershipSummary.adminUsers}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Members</p>
              <p className="mt-2 text-2xl font-semibold text-textPrimary">{membershipSummary.memberUsers}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Invited</p>
              <p className="mt-2 text-2xl font-semibold text-textPrimary">{membershipSummary.invitedUsers}</p>
            </div>
            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-3.5">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Inactive</p>
              <p className="mt-2 text-2xl font-semibold text-textPrimary">{membershipSummary.inactiveUsers}</p>
            </div>
          </div>
          <div className="mt-4">
            <Table columns={["User", "Role / status", "Contacts", "Last active"]} rows={membershipRows} />
          </div>
        </SurfaceSection>

        <SurfaceSection title="Activity / audit summary" eyebrow="Timeline" description="Recent tenant events for access, status, and enablement monitoring.">
          <div className="space-y-4">
            {tenantEvents.length ? tenantEvents.map((event) => <TimelineItem key={event.id} event={event} />) : <EmptyState title="No tenant activity yet" detail="Audit events will appear here when this organisation is touched by access, configuration, or release operations." />}
          </div>
        </SurfaceSection>
      </section>
    </div>
  )
}

export function AdminUsersWireframePage({ accessRegistryData }: { accessRegistryData: AdminAccessRegistryDomainData }) {
  const internalUsers = accessRegistryData.users.filter((user) => user.kind === 'internal_admin')
  const organisationUsers = accessRegistryData.users.filter((user) => user.kind === 'organisation_user')
  const accessReviewUsers = accessRegistryData.users.filter((user) => {
    const assessment = assessUserAccessPriority(user, accessRegistryData)

    return assessment.level === 'critical' || assessment.level === 'high'
  })
  const multiMembershipUsers = accessRegistryData.users.filter((user) => getUserSummary(user, accessRegistryData).memberships.length > 1)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow="Users" title="Access control registry" description="Operator-facing registry for Sonartra admins, tenant users, invite posture, and access risk across the multi-tenant estate." actions={<Button variant="secondary">Review flagged users</Button>} />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Internal admins" value={String(internalUsers.length).padStart(2, '0')} detail="Privileged Sonartra operators with platform, assessment, support, or customer operations scope." />
        <MetricCard label="Organisation users" value={String(organisationUsers.length).padStart(2, '0')} detail="Customer-side accounts with tenant-scoped access and membership-linked roles." />
        <MetricCard label="Review queue" value={String(accessReviewUsers.length).padStart(2, '0')} detail="High and critical priority identities that should rise to the top of the operator queue." />
        <MetricCard label="Multi-org identities" value={String(multiMembershipUsers.length).padStart(2, '0')} detail="Users spanning more than one organisation membership and needing explicit scope awareness." />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.35fr_0.65fr] xl:items-start">
        <AdminUsersAccessRegistryClient accessRegistryData={accessRegistryData} />
        <UserRoleReferencePanel />
      </div>
    </div>
  )
}

export function AdminUserDetailWireframePage({ userId, accessRegistryData }: { userId: string; accessRegistryData: AdminAccessRegistryDomainData }) {
  const user = findUserById(userId, accessRegistryData)

  if (!user) {
    return <EmptyState title="User not found" detail="The requested user id is not present in the access registry." action={<Button href="/admin/users" variant="secondary">Back to users</Button>} />
  }

  const summary = getUserSummary(user, accessRegistryData)
  const accessFlags = getUserAccessSignals(user, undefined, accessRegistryData)
  const accessHistory = getUserAccessHistory(user, accessRegistryData)
  const roleSummary = getUserRoleSummary(user, accessRegistryData)
  const activityBand = getUserActivityBand(user, undefined, accessRegistryData)
  const priorityAssessment = assessUserAccessPriority(user, accessRegistryData)
  const primaryMembership = summary.memberships.find((membership) => membership.organisationId === user.primaryOrganisationId) ?? summary.memberships[0] ?? null
  const internalRoleDefinition = user.internalAdminRole ? adminRoleDefinitions[user.internalAdminRole] : null
  const membershipRows = summary.memberships.map((membership) => {
    const organisation = accessRegistryData.organisations.find((organisationItem) => organisationItem.id === membership.organisationId)

    return [
      <div key={`${membership.id}-org`}>
        <p className="text-sm font-semibold text-textPrimary">{organisation?.name ?? membership.organisationId}</p>
        <p className="mt-1 text-xs text-textSecondary">{organisation ? `${organisation.region} · ${organisation.status}` : 'Organisation not found'}</p>
      </div>,
      <div key={`${membership.id}-role`} className="space-y-2">
        <StatusBadge status={membership.role} />
        <p className="text-xs text-textSecondary">{membership.isAssessmentContact ? 'Assessment contact' : membership.isBillingContact ? 'Billing contact' : 'Standard member scope'}</p>
      </div>,
      <div key={`${membership.id}-joined`}>
        <p className="text-sm font-medium text-textPrimary">{membership.joinedAt ? formatShortAdminDate(membership.joinedAt) : 'Invite pending'}</p>
        <p className="text-xs text-textSecondary">Invited {formatShortAdminDate(membership.invitedAt)}</p>
      </div>,
      <div key={`${membership.id}-activity`}>
        <p className="text-sm font-medium text-textPrimary">{formatAdminRelativeTime(membership.lastActiveAt)}</p>
        <p className="text-xs text-textSecondary">{formatAdminTimestamp(membership.lastActiveAt)}</p>
      </div>,
    ]
  })

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="User detail"
        title={user.profile.fullName}
        description="Structured identity, role, membership, activity, and audit context for operator-led access review."
        actions={
          <>
            <StatusBadge status={user.status === 'deactivated' ? 'inactive' : user.status} />
            <Button href="/admin/users" variant="ghost">Back to users</Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="eyebrow">Identity overview</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={user.kind} />
            <Badge label={roleSummary.label} tone={roleSummary.tone} />
            <Badge label={getActivityBandLabel(activityBand)} tone={activityBand === 'active' ? 'emerald' : activityBand === 'recent' ? 'sky' : activityBand === 'watch' ? 'amber' : 'slate'} />
          </div>
          <div className="mt-5">
            <MetaGrid
              items={[
                { label: 'Email', value: user.email },
                { label: 'Identity type', value: getKindLabel(user) },
                { label: 'Auth binding', value: user.externalAuthId ?? 'Invite pending / no linked auth id' },
                { label: 'Last active', value: formatAdminTimestamp(user.recentActivity.lastActiveAt) },
              ]}
            />
          </div>
          <div className="mt-4 rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Access flags</p>
            <div className="mt-3">
              <AccessFlagGroup labels={accessFlags} />
            </div>
          </div>
        </Card>

        <div className="grid gap-4">
          <MetaPanel
            title="Role and permissions context"
            items={[
              { label: 'Resolved role', value: roleSummary.label },
              { label: 'Primary organisation', value: summary.primaryOrganisation?.name ?? 'Internal-only operator' },
              { label: 'Membership count', value: `${summary.memberships.length}` },
              {
                label: 'Permissions scope',
                value: internalRoleDefinition
                  ? internalRoleDefinition.capabilities.map((capability) => capability.replace(':view', '')).join(' · ')
                  : primaryMembership
                    ? `${getStatusLabel(primaryMembership.role)} within ${summary.memberships.length > 1 ? 'multi-organisation' : 'single-organisation'} scope`
                    : 'No tenant membership assigned',
              },
            ]}
            footer={<p className="text-xs leading-5 text-textSecondary">Editing flows remain intentionally absent; this surface is for review, audit, and operational decision support.</p>}
          />
          <MetaPanel
            title="Priority assessment"
            items={[
              { label: 'Priority level', value: <Badge label={priorityAssessment.level} tone={priorityAssessment.level === 'critical' ? 'rose' : priorityAssessment.level === 'high' ? 'amber' : priorityAssessment.level === 'medium' ? 'sky' : 'slate'} /> },
              { label: 'Score', value: `${priorityAssessment.score}` },
              {
                label: 'Derived reasons',
                value: priorityAssessment.reasons.length ? (
                  <ul className="space-y-1">
                    {priorityAssessment.reasons.map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                  </ul>
                ) : 'No priority signals derived from the current access facts.',
              },
            ]}
          />
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-3">
        <MetaPanel
          title="Activity summary"
          items={[
            { label: 'Current posture', value: getActivityBandLabel(activityBand) },
            { label: 'Last audit event', value: accessHistory[0]?.summary ?? 'No user-linked audit event' },
            { label: 'Created', value: formatAdminTimestamp(user.createdAt) },
          ]}
        />
        <MetaPanel
          title="Membership posture"
          items={[
            { label: 'Primary tenant', value: summary.primaryOrganisation?.name ?? 'Not tenant-scoped' },
            { label: 'Org access count', value: `${summary.memberships.length}` },
            { label: 'Secondary scope', value: summary.memberships.length > 1 ? 'User spans multiple organisations' : 'Single-scope access' },
          ]}
        />
        <MetaPanel
          title="Audit summary"
          items={[
            { label: 'History entries', value: `${accessHistory.length}` },
            { label: 'Latest event time', value: accessHistory[0] ? formatAdminTimestamp(accessHistory[0].occurredAt) : 'No event recorded' },
            { label: 'Review note', value: accessFlags.length ? 'Signals present; include in access review queue.' : 'No immediate access review signal.' },
          ]}
        />
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceSection title="Memberships" eyebrow="Organisation access" description="Organisation scope remains compact and structured so operators can review tenant access without profile-heavy presentation.">
          {membershipRows.length ? (
            <Table columns={["Organisation", "Role / contacts", "Joined / invited", "Last active"]} rows={membershipRows} />
          ) : (
            <EmptyState title="No tenant memberships" detail="This identity currently has no organisation memberships attached." />
          )}
        </SurfaceSection>

        <SurfaceSection title="Access history" eyebrow="Audit context" description="User-linked audit evidence and access changes remain visible in the same structured timeline pattern used across admin.">
          <div className="space-y-4">
            {accessHistory.length ? accessHistory.map((event) => <TimelineItem key={event.id} event={event} />) : <EmptyState title="No access history" detail="Audit entries touching this user or their memberships will appear here." />}
          </div>
        </SurfaceSection>
      </section>
    </div>
  )
}

export function AdminAssessmentsWireframePage() {
  const rows = assessments.map((assessment) => {
    const summary = getAssessmentSummary(assessment)

    return [
      <div key={`${assessment.id}-title`}>
        <Link href={`/admin/assessments/${assessment.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-textPrimary hover:text-accent">
          {assessment.title}
          <ChevronRight className="h-4 w-4" />
        </Link>
        <p className="mt-1 text-sm text-textSecondary">{assessment.description}</p>
      </div>,
      <div key={`${assessment.id}-category`} className="space-y-2">
        <Badge label={getStatusLabel(assessment.category)} tone="violet" />
        <div>
          <StatusBadge status={assessment.status} />
        </div>
      </div>,
      <div key={`${assessment.id}-live`}>
        <p className="text-sm font-medium text-textPrimary">{summary.liveVersion?.versionNumber ?? 'Not live'}</p>
        <p className="text-xs text-textSecondary">{summary.versions.length} total versions</p>
      </div>,
      <div key={`${assessment.id}-versions`} className="text-sm text-textSecondary">{summary.versionCounts.draft} draft · {summary.versionCounts.in_review} review · {summary.versionCounts.validated} validated</div>,
      <div key={`${assessment.id}-metadata`}>
        <p className="text-sm font-medium text-textPrimary">{summary.enabledTenants.length} enabled tenants</p>
        <p className="text-xs text-textSecondary">Owner {summary.owner?.profile.fullName ?? 'Unknown'}</p>
      </div>,
    ]
  })

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow="Assessments" title="Assessment registry" description="Versioned product-asset registry for controlled behavioural intelligence assessments, with strong metadata, status, and lineage visibility." actions={<Button href="/admin/assessments/new" variant="secondary">New assessment / import</Button>} />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Assessment lines" value={String(assessments.length).padStart(2, '0')} detail="Stable assessment entities governed independently from version releases." />
        <MetricCard label="Versions in motion" value={String(assessmentVersions.filter((version) => version.status !== AssessmentVersionStatus.Live && version.status !== AssessmentVersionStatus.Archived).length).padStart(2, '0')} detail="Draft, in-review, and validated versions currently moving through release controls." />
        <MetricCard label="Live baselines" value={String(assessmentVersions.filter((version) => version.status === AssessmentVersionStatus.Live).length).padStart(2, '0')} detail="Published versions serving customer-facing behavioural intelligence logic." />
        <MetricCard label="Validation flags" value={String(assessmentVersions.filter((version) => version.validationSummary.ruleErrors > 0 || version.validationSummary.ruleWarnings > 0).length).padStart(2, '0')} detail="Versions with structural issues, warnings, or preview readiness notes." />
      </div>

      <SurfaceSection title="Assessment asset registry" eyebrow="Registry list" description="Controlled asset list design prioritising category, status, live version, version lineage, and owner metadata.">
        <FilterBar searchPlaceholder="Search title, category, owner, or version…" segments={["All assets", "Live", "Maintenance", "Validation attention"]} trailing={<Button href="/admin/assessments/new" variant="ghost">Import workflow</Button>} />
        <div className="mt-4">
          <Table columns={["Assessment", "Category / status", "Live version", "Version lineage", "Asset metadata"]} rows={rows} />
        </div>
      </SurfaceSection>
    </div>
  )
}

export function AdminAssessmentDetailWireframePage({ slug }: { slug: string }) {
  const assessment = findAssessmentBySlug(slug)

  if (!assessment) {
    return <EmptyState title="Assessment not found" detail="The requested assessment slug is not present in the typed Sonartra admin domain model." action={<Button href="/admin/assessments" variant="secondary">Back to assessments</Button>} />
  }

  const summary = getAssessmentSummary(assessment)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow="Assessment detail" title={assessment.title} description="Tabs, metadata hierarchy, versions, questions, scoring, output model, and release controls for a governed assessment asset." actions={<StatusBadge status={assessment.status} />} />
      <Tabs items={getAssessmentTabs(assessment, 'overview')} />

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="eyebrow">Overview</p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-textSecondary">{assessment.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge label={getStatusLabel(assessment.category)} tone="violet" />
            <Badge label={`Owner · ${summary.owner?.profile.fullName ?? 'Unknown'}`} tone="slate" />
            <Badge label={`${summary.enabledTenants.length} enabled tenants`} tone="slate" />
          </div>
          <div className="mt-5">
            <MetaGrid
              items={[
                { label: 'Current live version', value: summary.liveVersion?.versionNumber ?? 'No live baseline' },
                { label: 'Question bank', value: `${summary.liveVersion?.questionCount ?? 84} questions`, hint: 'Current model snapshot' },
                { label: 'Scoring model', value: summary.liveVersion?.scoringModelVersion ?? 'Pending' },
                { label: 'Output model', value: summary.liveVersion?.outputModelVersion ?? 'Pending' },
              ]}
            />
          </div>
        </Card>

        <MetaPanel
          title="Release controls"
          items={[
            { label: 'Validated versions', value: `${summary.versionCounts.validated}` },
            { label: 'In review', value: `${summary.versionCounts.in_review}` },
            { label: 'Audit events', value: `${summary.auditEvents.length}` },
          ]}
          footer={<Button href={summary.versions[0] ? `/admin/assessments/${assessment.slug}/versions/${summary.versions[0].versionNumber}` : '/admin/assessments'} variant="secondary">Inspect latest version</Button>}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.02fr_0.98fr]">
        <SurfaceSection title="Version lineage" eyebrow="Controlled history" description="Stable assessment identity on the left, mutable version records underneath, with release state visible at a glance.">
          <div className="space-y-3">
            {summary.versions.map((version) => (
              <Link key={version.id} href={`/admin/assessments/${assessment.slug}/versions/${version.versionNumber}`} className="block rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-4 hover:border-accent/20 hover:bg-panel/80">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="text-sm font-semibold text-textPrimary">Version {version.versionNumber}</p>
                    <p className="mt-1 text-sm text-textSecondary">{version.changelogSummary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={version.status} />
                    <StatusBadge status={version.publishStatus} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </SurfaceSection>

        <SurfaceSection title="Questions, scoring, outputs" eyebrow="Implementation scaffolding" description="High-fidelity placeholder pattern that subsequent implementation prompts can replace with real editors and inspectors while preserving hierarchy.">
          <div className="grid gap-3">
            <MetaPanel title="Questions" items={[{ label: 'Structure', value: 'Sectioned question bank with immutable version snapshots and preview references.' }]} />
            <MetaPanel title="Scoring" items={[{ label: 'Model', value: summary.liveVersion?.scoringModelVersion ?? 'Version-specific scoring engine to be attached here.' }]} />
            <MetaPanel title="Output model" items={[{ label: 'Renderer', value: summary.liveVersion?.outputModelVersion ?? 'Result schema and narrative output config to be attached here.' }]} />
          </div>
        </SurfaceSection>
      </section>
    </div>
  )
}

export function AdminAssessmentVersionDetailWireframePage({ slug, versionNumber }: { slug: string; versionNumber: string }) {
  const assessment = findAssessmentBySlug(slug)
  const version = findAssessmentVersion(slug, versionNumber)

  if (!assessment || !version) {
    return <EmptyState title="Assessment version not found" detail="The requested assessment/version combination is not present in the typed Sonartra admin domain model." action={<Button href="/admin/assessments" variant="secondary">Back to assessments</Button>} />
  }

  const events = getVersionAuditEvents(version.id)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow="Assessment version" title={`${assessment.title} · v${version.versionNumber}`} description="Version metadata, validation state, publish posture, configuration summary, audit timeline, and release progression UI." actions={<><StatusBadge status={version.status} /><StatusBadge status={version.publishStatus} /></>} />
      <Tabs items={getAssessmentTabs(assessment, 'version', version)} />

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <SurfaceSection title="Version metadata" eyebrow="Version frame" description="Metadata hierarchy keeps the immutable version snapshot distinct from the parent assessment line.">
          <MetaGrid items={[{ label: 'Question count', value: `${version.questionCount}` }, { label: 'Scoring model', value: version.scoringModelVersion }, { label: 'Output model', value: version.outputModelVersion }, { label: 'Updated', value: formatAdminTimestamp(version.updatedAt) }]} />
          <div className="mt-4 rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Changelog summary</p>
            <p className="mt-2 text-sm leading-6 text-textSecondary">{version.changelogSummary}</p>
          </div>
        </SurfaceSection>

        <MetaPanel
          title="Validation state"
          items={[
            { label: 'Rule errors', value: `${version.validationSummary.ruleErrors}` },
            { label: 'Warnings', value: `${version.validationSummary.ruleWarnings}` },
            { label: 'Preview ready', value: version.validationSummary.previewReady ? 'Yes' : 'No' },
            { label: 'Publish target', value: version.publishTarget.description },
          ]}
          footer={<PanelActionRow primaryHref={`/admin/releases/${version.id}/validation`} primaryLabel="Validation + preview" secondaryHref={`/admin/releases/${version.id}/publish`} secondaryLabel="Release control" />}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceSection title="Release progression" eyebrow="Release rail" description="Same progression model used on release control pages, keeping readiness, blockers, and publish state aligned.">
          <ReleaseRail version={version} />
        </SurfaceSection>

        <SurfaceSection title="Audit and event timeline" eyebrow="Evidence" description="Timeline treatment is reusable across versions, releases, users, and tenant operations.">
          <div className="space-y-4">
            {events.length ? events.map((event) => <TimelineItem key={event.id} event={event} />) : <EmptyState title="No version-specific events" detail="Event history for this version will appear here as release and validation controls are exercised." />}
          </div>
        </SurfaceSection>
      </section>
    </div>
  )
}

export function AdminAssessmentNewWorkflowWireframePage() {
  const steps = [
    { label: '01 · Metadata', detail: 'Define asset identity, category, owner, and intended behavioural intelligence scope.', icon: ClipboardList },
    { label: '02 · Import method', detail: 'Select controlled source: structured import bundle, duplicated registry asset, or manual scaffold.', icon: GitBranch },
    { label: '03 · Review', detail: 'Confirm metadata, source integrity, and intended target release pathway before generating the draft version.', icon: CheckCircle2 },
  ]

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow="New assessment" title="Governed assessment creation + import" description="Deliberate entry flow for creating a new assessment line or importing a controlled version bundle — not a casual file-upload screen." actions={<Button variant="secondary">Save draft brief</Button>} />

      <div className="grid gap-4 xl:grid-cols-[0.88fr_1.12fr]">
        <MetaPanel title="Workflow steps" items={steps.map((step) => ({ label: step.label, value: step.detail }))} footer={<Badge label="Governed flow" tone="sky" />} />

        <SurfaceSection title="Step 1 · Assessment metadata" eyebrow="Entry point" description="The first surface establishes stable asset identity before any version content is introduced.">
          <div className="grid gap-3 md:grid-cols-2">
            <MetaPanel title="Core identity" items={[{ label: 'Title', value: 'Organisation Resilience Index' }, { label: 'Registry key', value: 'organisation_resilience_index' }, { label: 'Category', value: 'Organisational Performance' }]} />
            <MetaPanel title="Governance context" items={[{ label: 'Owner', value: 'Rina Patel · Platform Operations' }, { label: 'Planned release class', value: 'Staged enterprise rollout' }, { label: 'Intended evidence pack', value: 'Validation report + preview baseline + release sign-off' }]} />
          </div>
          <WorkflowSummaryCards />
        </SurfaceSection>
      </div>

      <SurfaceSection title="Import review summary" eyebrow="Step 3" description="Review state prioritises governance and release readiness language over upload convenience.">
        <MetaGrid columns={3} items={[{ label: 'Source package', value: 'signals-v3-import.json', hint: 'Signed by Assessment Ops' }, { label: 'Structural integrity', value: 'Passed initial schema checks', hint: 'No blocking parse issues' }, { label: 'Generated outcome', value: 'Draft version v0.1.0 prepared', hint: 'Requires validation before preview / release' }]} />
      </SurfaceSection>
    </div>
  )
}

export function AdminValidationPreviewWireframePage({ versionId }: { versionId: string }) {
  const version = assessmentVersions.find((item) => item.id === versionId)
  const assessment = version ? assessments.find((item) => item.id === version.assessmentId) : null

  if (!version || !assessment) {
    return <EmptyState title="Validation surface unavailable" detail="The requested version id is not present in the typed Sonartra admin domain model." action={<Button href="/admin/releases" variant="secondary">Back to releases</Button>} />
  }

  const issues = getValidationIssues(version)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow="Validation + preview" title={`${assessment.title} · v${version.versionNumber}`} description="Structural checks, pass/warning/error treatment, version preview, and explicit linkage between readiness and release control." actions={<><StatusBadge status={version.status} /><Button href={`/admin/releases/${version.id}/publish`} variant="secondary">Open publish control</Button></>} />

      <section className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
        <SurfaceSection title="Validation outcomes" eyebrow="Readiness" description="Validation state indicators separate blocking issues from reviewable warnings and keep release consequences obvious.">
          <div className="space-y-3">
            {issues.map((issue) => <ValidationIssueCard key={issue.label} issue={issue} />)}
          </div>
        </SurfaceSection>

        <SurfaceSection title="Preview bundle" eyebrow="Version preview" description="Preview pattern keeps content and output structure visible without pretending to be the final authoring environment.">
          <div className="grid gap-3 md:grid-cols-2">
            <MetaPanel title="Version content" items={[{ label: 'Question count', value: `${version.questionCount} items across behavioural dimensions` }, { label: 'Scoring model', value: version.scoringModelVersion }, { label: 'Output model', value: version.outputModelVersion }]} />
            <MetaPanel title="Output structure" items={[{ label: 'Result layers', value: 'Behaviour style, stress mapping, motivators, leadership, culture.' }, { label: 'Preview state', value: version.validationSummary.previewReady ? 'Preview generated' : 'Preview unavailable' }, { label: 'Release implication', value: version.validationSummary.ruleErrors === 0 && version.validationSummary.previewReady ? 'Can proceed to release review' : 'Blocked from publish decision' }]} />
          </div>
        </SurfaceSection>
      </section>
    </div>
  )
}

export function AdminPublishControlWireframePage({ versionId }: { versionId: string }) {
  const version = assessmentVersions.find((item) => item.id === versionId)
  const assessment = version ? assessments.find((item) => item.id === version.assessmentId) : null

  if (!version || !assessment) {
    return <EmptyState title="Release control unavailable" detail="The requested version id is not present in the typed Sonartra admin domain model." action={<Button href="/admin/releases" variant="secondary">Back to releases</Button>} />
  }

  const blockers = getReleaseBlockers(version)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow="Publish control" title={`${assessment.title} · v${version.versionNumber}`} description="Release-state progression, target visibility, blockers, dependencies, evidence areas, and publish control actions." actions={<><StatusBadge status={version.publishStatus} /><Button href={`/admin/releases/${version.id}/validation`} variant="ghost">Back to validation</Button></>} />

      <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
        <SurfaceSection title="Release-state progression" eyebrow="Progression" description="Release-state indicators use the same visual language as version detail to keep workflow transitions consistent.">
          <ReleaseRail version={version} />
        </SurfaceSection>

        <SurfaceSection title="Enablement target + evidence" eyebrow="Decision frame" description="Target scope, blockers, and evidence are laid out before any publish action is shown.">
          <div className="grid gap-3 md:grid-cols-2">
            <MetaPanel title="Enablement target" items={[{ label: 'Target class', value: getStatusLabel(version.publishTarget.type) }, { label: 'Description', value: version.publishTarget.description }, { label: 'Enabled organisations', value: `${assessment.enabledOrganisationIds.length}` }]} />
            <MetaPanel title="Evidence areas" items={[{ label: 'Validation report', value: version.validationSummary.ruleErrors === 0 ? 'Attached' : 'Requires remediation' }, { label: 'Preview pack', value: version.validationSummary.previewReady ? 'Attached' : 'Unavailable' }, { label: 'Audit trail', value: 'Ready to capture actor and decision metadata' }]} />
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <ReadinessBlockers blockers={blockers} />
            <Card className="px-4 py-4">
              <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Publish summary</p>
              <p className="mt-3 text-sm leading-6 text-textSecondary">This screen deliberately slows the operator down: target scope, readiness evidence, and blocker visibility all precede the publish controls.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button disabled={blockers.length > 0}>Publish version</Button>
                <Button variant="secondary">Schedule window</Button>
                <Button variant="ghost">Pause / rollback plan</Button>
              </div>
            </Card>
          </div>
        </SurfaceSection>
      </section>
    </div>
  )
}

export function AdminAuditWireframePage() {
  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow="Audit" title="Operational audit log" description="Searchable, filterable audit surface with calm timeline/list patterns and reusable evidence language." actions={<Button variant="secondary">Export evidence set</Button>} />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Indexed events" value={String(auditLogEvents.length).padStart(2, '0')} detail="Privileged actions and operational changes currently represented in the typed audit stream." />
        <MetricCard label="Release actions" value={String(auditLogEvents.filter((event) => event.entity.entityType === 'release').length).padStart(2, '0')} detail="Release-specific events forming publish decision evidence." />
        <MetricCard label="Access changes" value={String(auditLogEvents.filter((event) => event.entity.entityType === 'admin_access' || event.entity.entityType === 'membership').length).padStart(2, '0')} detail="Events affecting operator or tenant access posture." />
        <MetricCard label="Evidence entities" value="07" detail="Shared timeline language across organisations, users, assessment versions, releases, and admin access." />
      </div>

      <SurfaceSection title="Audit event stream" eyebrow="Timeline pattern" description="Entity, action, date, and actor remain legible even at higher density, while the filter bar preserves room for future query controls.">
        <FilterBar searchPlaceholder="Search actor, entity, action, or timestamp…" segments={["All events", "Release", "Access", "Tenant"]} trailing={<Button variant="ghost">Saved views</Button>} />
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-4">
            {auditLogEvents.map((event) => <TimelineItem key={event.id} event={event} />)}
          </div>
          <MetaPanel
            title="Timeline language"
            items={[
              { label: 'Actor clarity', value: 'Display name first, entity and action second, timestamp aligned right.' },
              { label: 'Calm density', value: 'Soft separators and minimal accent use prevent the audit stream from feeling noisy.' },
              { label: 'Evidence extensions', value: 'Future prompts can attach payload diffs, export controls, and saved filters in this side panel.' },
            ]}
          />
        </div>
      </SurfaceSection>
    </div>
  )
}
