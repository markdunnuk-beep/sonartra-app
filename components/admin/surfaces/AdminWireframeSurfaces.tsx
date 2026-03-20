import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList, Clock3, GitBranch } from 'lucide-react'
import Link from 'next/link'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
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
import { assessmentVersions, assessments, auditLogEvents, getSeatUtilisationPercent, getStatusLabel, organisations, adminUsers } from '@/lib/admin/domain'
import { AssessmentVersionStatus, PublishStatus } from '@/lib/admin/domain/assessments'
import {
  findAssessmentBySlug,
  findAssessmentVersion,
  findOrganisationBySlug,
  findUserById,
  formatAdminTimestamp,
  formatShortAdminDate,
  getAssessmentSummary,
  getAssessmentTabs,
  getDashboardPrimaryRelease,
  getKindLabel,
  getOrganisationAuditEvents,
  getOrganisationSummary,
  getReleaseBlockers,
  getUserSummary,
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

export function AdminOrganisationsWireframePage() {
  const rows = organisations.map((organisation) => {
    const summary = getOrganisationSummary(organisation)
    const enabledAssessmentLabels = summary.enabledProducts.map((product) => product.label).join(' · ')

    return [
      <div key={`${organisation.id}-entity`}>
        <Link href={`/admin/organisations/${organisation.slug}`} className="inline-flex items-center gap-2 text-sm font-semibold text-textPrimary hover:text-accent">
          {organisation.name}
          <ChevronRight className="h-4 w-4" />
        </Link>
        <p className="mt-1 text-sm text-textSecondary">{organisation.sector} · {organisation.region}</p>
      </div>,
      <div key={`${organisation.id}-status`} className="space-y-2">
        <StatusBadge status={organisation.status} />
        <div>
          <Badge label={getStatusLabel(organisation.plan)} tone="slate" />
        </div>
      </div>,
      <div key={`${organisation.id}-seats`}>
        <p className="text-sm font-medium text-textPrimary">{organisation.seatSummary.assigned}/{organisation.seatSummary.purchased}</p>
        <p className="text-xs text-textSecondary">{summary.seatUtilisation}% utilised · {organisation.seatSummary.invited} invited</p>
      </div>,
      <div key={`${organisation.id}-assessments`} className="text-sm text-textSecondary">{enabledAssessmentLabels || 'No enabled products'}</div>,
      <div key={`${organisation.id}-activity`}>
        <p className="text-sm font-medium text-textPrimary">{formatAdminTimestamp(organisation.lastActivityAt)}</p>
        <p className="text-xs text-textSecondary">Primary contact {summary.contact?.profile.fullName ?? 'Unassigned'}</p>
      </div>,
    ]
  })

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Organisations"
        title="Customer tenancy operations"
        description="Searchable operational registry for tenant posture, seat capacity, workspace state, and enabled behavioural intelligence products."
        actions={<Button variant="secondary">New tenant brief</Button>}
      />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Managed tenants" value={String(organisations.length).padStart(2, '0')} detail="Tracked workspaces across active, implementation, and suspended states." />
        <MetricCard label="Seat utilisation" value={`${Math.round(organisations.reduce((total, organisation) => total + getSeatUtilisationPercent(organisation), 0) / organisations.length)}%`} detail="Average assigned-seat utilisation across the tenant estate." />
        <MetricCard label="Implementation queue" value={String(organisations.filter((organisation) => organisation.status === 'implementation').length).padStart(2, '0')} detail="Tenants currently in rollout, provisioning, or enablement work." />
        <MetricCard label="Dormant risk" value={String(adminDashboardModel.tenantHealth.filter((tenant) => tenant.statusFlags.includes('Dormant tenant activity')).length).padStart(2, '0')} detail="Tenants requiring intervention due to low recency or suspended posture." />
      </div>

      <SurfaceSection title="Tenant registry" eyebrow="List pattern" description="Entity-first list design with persistent search/filter controls, seat posture visibility, and status treatment aligned with the rest of the admin system.">
        <FilterBar searchPlaceholder="Search organisation, region, contact, or product…" segments={["All tenants", "Active", "Implementation", "Attention required"]} trailing={<Button href="/admin/audit" variant="ghost">View tenant audit</Button>} />
        <div className="mt-4">
          <Table columns={["Organisation", "Status", "Seats", "Enabled products", "Recent activity"]} rows={rows} />
        </div>
      </SurfaceSection>

      <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceSection title="Action-needed queue" eyebrow="Operational triage" description="Queue treatment for tenant states that require operator follow-up rather than passive observation.">
          <div className="grid gap-3 md:grid-cols-2">
            {adminDashboardModel.tenantHealth.slice(0, 4).map((tenant) => (
              <QueueItem
                key={tenant.organisationId}
                title={tenant.organisationName}
                detail={`${tenant.statusFlags.join(' · ') || 'No active flags'} · ${tenant.seatUsage} seats assigned.`}
                tone={tenant.status === 'Suspended' ? 'rose' : tenant.status === 'Implementation' ? 'amber' : 'emerald'}
                href={`/admin/organisations/${organisations.find((item) => item.id === tenant.organisationId)?.slug ?? ''}`}
                meta={tenant.recentActivityLabel}
                cta="Open tenant detail"
              />
            ))}
          </div>
        </SurfaceSection>

        <MetaPanel
          title="Registry standards"
          items={[
            { label: 'Header structure', value: 'Page title + operational framing + concise CTA cluster.' },
            { label: 'Filter bar', value: 'Search left, status segments center, utility actions right.' },
            { label: 'List cells', value: 'Primary line for entity identity, secondary line for role, region, or contact context.' },
          ]}
        />
      </section>
    </div>
  )
}

export function AdminOrganisationDetailWireframePage({ slug }: { slug: string }) {
  const organisation = findOrganisationBySlug(slug)

  if (!organisation) {
    return <EmptyState title="Organisation not found" detail="The requested tenant slug is not present in the typed Sonartra admin domain model." action={<Button href="/admin/organisations" variant="secondary">Back to organisations</Button>} />
  }

  const summary = getOrganisationSummary(organisation)
  const tenantEvents = getOrganisationAuditEvents(organisation.id)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Organisation detail"
        title={organisation.name}
        description="Tenant overview with seat posture, memberships, enabled assessments, recent activity, and operational context in a single controlled frame."
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
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-textSecondary">{organisation.name} is modelled as a managed customer tenancy, not a generic account record. Workspace posture, seat usage, enablement, and internal intervention signals stay visible together.</p>
          <div className="mt-5">
            <MetaGrid
              items={[
                { label: 'Seat usage', value: `${organisation.seatSummary.assigned}/${organisation.seatSummary.purchased}`, hint: `${summary.seatUtilisation}% utilisation · ${organisation.seatSummary.available} seats available` },
                { label: 'Invited seats', value: `${organisation.seatSummary.invited}`, hint: 'Pending user activation' },
                { label: 'Workspace provisioned', value: organisation.workspaceProvisionedAt ? 'Provisioned' : 'Pending', hint: formatAdminTimestamp(organisation.workspaceProvisionedAt) },
                { label: 'Contract renewal', value: formatShortAdminDate(organisation.contractRenewalDate), hint: 'Commercial renewal checkpoint' },
              ]}
            />
          </div>
        </Card>

        <MetaPanel
          title="Operational status"
          items={[
            { label: 'Primary contact', value: summary.contact ? `${summary.contact.profile.fullName} · ${summary.contact.email}` : 'Unassigned' },
            { label: 'Enabled assessments', value: organisation.enabledAssessmentIds.length ? organisation.enabledAssessmentIds.map((assessmentId) => assessments.find((item) => item.id === assessmentId)?.title ?? assessmentId).join(' · ') : 'No active enablement' },
            { label: 'Last activity', value: formatAdminTimestamp(organisation.lastActivityAt) },
          ]}
          footer={<Button variant="secondary">Prepare intervention summary</Button>}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceSection title="Membership + role context" eyebrow="Access summary" description="Customer memberships remain tenant-scoped and clearly separate from internal Sonartra admin controls.">
          <div className="space-y-3">
            {summary.users.map((user) => {
              const membership = summary.memberships.find((item) => item.userId === user.id)
              return (
                <div key={user.id} className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <Link href={`/admin/users/${user.id}`} className="text-sm font-semibold text-textPrimary hover:text-accent">
                        {user.profile.fullName}
                      </Link>
                      <p className="mt-1 text-sm text-textSecondary">{user.email} · {user.profile.title ?? 'No title set'}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <StatusBadge status={user.status} />
                      {membership ? <StatusBadge status={membership.role} /> : null}
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-textSecondary md:grid-cols-3">
                    <p>Billing contact: {membership?.isBillingContact ? 'Yes' : 'No'}</p>
                    <p>Assessment contact: {membership?.isAssessmentContact ? 'Yes' : 'No'}</p>
                    <p>Last active: {formatAdminTimestamp(user.recentActivity.lastActiveAt)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </SurfaceSection>

        <SurfaceSection title="Recent activity + controls" eyebrow="Timeline" description="Calm operational timeline language for changes affecting tenant posture, access, or release enablement.">
          <div className="space-y-4">
            {tenantEvents.length ? tenantEvents.map((event) => <TimelineItem key={event.id} event={event} />) : <EmptyState title="No tenant activity yet" detail="Audit events will appear here when this organisation is touched by access, configuration, or release operations." />}
          </div>
        </SurfaceSection>
      </section>
    </div>
  )
}

export function AdminUsersWireframePage() {
  const rows = adminUsers.map((user) => {
    const summary = getUserSummary(user)

    return [
      <div key={`${user.id}-name`}>
        <Link href={`/admin/users/${user.id}`} className="inline-flex items-center gap-2 text-sm font-semibold text-textPrimary hover:text-accent">
          {user.profile.fullName}
          <ChevronRight className="h-4 w-4" />
        </Link>
        <p className="mt-1 text-sm text-textSecondary">{user.email}</p>
      </div>,
      <div key={`${user.id}-kind`} className="space-y-2">
        <StatusBadge status={user.kind} />
        {user.internalAdminRole ? (
          <div>
            <StatusBadge status={user.internalAdminRole} />
          </div>
        ) : null}
      </div>,
      <div key={`${user.id}-status`}>
        <StatusBadge status={user.status} />
      </div>,
      <div key={`${user.id}-memberships`} className="text-sm text-textSecondary">
        {summary.memberships.length} memberships{summary.primaryOrganisation ? ` · ${summary.primaryOrganisation.name}` : ''}
      </div>,
      <div key={`${user.id}-activity`}>
        <p className="text-sm font-medium text-textPrimary">{formatAdminTimestamp(user.recentActivity.lastActiveAt)}</p>
        <p className="text-xs text-textSecondary">{getKindLabel(user)}</p>
      </div>,
    ]
  })

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader eyebrow="Users" title="Internal operators and customer access" description="Unified access registry with explicit separation between privileged Sonartra admins and customer-side memberships." actions={<Button variant="secondary">Initiate access review</Button>} />

      <div className="grid gap-4 xl:grid-cols-4">
        <MetricCard label="Internal admins" value={String(adminUsers.filter((user) => user.kind === 'internal_admin').length).padStart(2, '0')} detail="Privileged Sonartra operators with governance, support, or release responsibilities." />
        <MetricCard label="Customer users" value={String(adminUsers.filter((user) => user.kind === 'organisation_user').length).padStart(2, '0')} detail="Tenant-level admins and members attached to customer organisations." />
        <MetricCard label="Pending access" value={String(adminUsers.filter((user) => user.status === 'invited' || user.status === 'suspended').length).padStart(2, '0')} detail="Accounts needing invite completion, review, or posture changes." />
        <MetricCard label="Role classes" value="05" detail="Shared role-badge system across internal and tenant-scoped access patterns." />
      </div>

      <SurfaceSection title="Access registry" eyebrow="List pattern" description="Same table and filter-bar system as organisations, with role/status treatment focused on access posture rather than tenancy posture.">
        <FilterBar searchPlaceholder="Search name, email, organisation, or role…" segments={["All users", "Internal admins", "Organisation users", "Attention required"]} trailing={<Button href="/admin/audit" variant="ghost">Access audit</Button>} />
        <div className="mt-4">
          <Table columns={["User", "Identity class", "Status", "Membership context", "Recent activity"]} rows={rows} />
        </div>
      </SurfaceSection>
    </div>
  )
}

export function AdminUserDetailWireframePage({ userId }: { userId: string }) {
  const user = findUserById(userId)

  if (!user) {
    return <EmptyState title="User not found" detail="The requested user id is not present in the typed Sonartra admin domain model." action={<Button href="/admin/users" variant="secondary">Back to users</Button>} />
  }

  const summary = getUserSummary(user)

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="User detail"
        title={user.profile.fullName}
        description="Profile summary, membership context, access posture, audit-linked activity, and future action area layout for admin operators."
        actions={
          <>
            <StatusBadge status={user.status} />
            <Button href="/admin/users" variant="ghost">Back to users</Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="px-6 py-5 sm:px-7 sm:py-6">
          <p className="eyebrow">Profile summary</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <StatusBadge status={user.kind} />
            {user.internalAdminRole ? <StatusBadge status={user.internalAdminRole} /> : null}
          </div>
          <MetaGrid
            items={[
              { label: 'Email', value: user.email },
              { label: 'Title', value: user.profile.title ?? 'Not set' },
              { label: 'Auth binding', value: user.externalAuthId ?? 'Invite pending / no linked auth id' },
              { label: 'Last active', value: formatAdminTimestamp(user.recentActivity.lastActiveAt) },
            ]}
          />
        </Card>

        <MetaPanel
          title="Access posture"
          items={[
            { label: 'Identity class', value: getKindLabel(user) },
            { label: 'Primary organisation', value: summary.primaryOrganisation?.name ?? 'Internal-only operator' },
            { label: 'Membership count', value: `${summary.memberships.length}` },
          ]}
          footer={<Button variant="secondary">Prepare action set</Button>}
        />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <SurfaceSection title="Membership and role context" eyebrow="Context" description="Customer memberships remain visible on the same page, while future actions occupy their own control area rather than crowding the profile summary.">
          <div className="space-y-3">
            {summary.memberships.length ? (
              summary.memberships.map((membership) => {
                const organisation = organisations.find((organisationItem) => organisationItem.id === membership.organisationId)
                return (
                  <div key={membership.id} className="rounded-2xl border border-white/[0.07] bg-bg/50 px-4 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-textPrimary">{organisation?.name ?? membership.organisationId}</p>
                        <p className="mt-1 text-sm text-textSecondary">Joined {formatAdminTimestamp(membership.joinedAt)} · Invited {formatAdminTimestamp(membership.invitedAt)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={membership.role} />
                        {membership.isAssessmentContact ? <Badge label="Assessment contact" tone="sky" /> : null}
                        {membership.isBillingContact ? <Badge label="Billing contact" tone="amber" /> : null}
                      </div>
                    </div>
                  </div>
                )
              })
            ) : (
              <EmptyState title="No tenant memberships" detail="This pattern intentionally leaves clear room for future internal-only action controls without implying customer memberships that do not exist." />
            )}
          </div>
        </SurfaceSection>

        <SurfaceSection title="Admin-relevant activity" eyebrow="Audit context" description="Recent activity and a future action area share the same side-by-side pattern used elsewhere in the system.">
          <div className="space-y-4">
            {summary.auditEvents.length ? summary.auditEvents.map((event) => <TimelineItem key={event.id} event={event} />) : <EmptyState title="No audit-linked activity" detail="Audit entries touching this user or their memberships will appear here." />}
            <MetaPanel
              title="Future action area"
              items={[
                { label: 'Planned controls', value: 'Reset invite, modify role, revoke tenant membership, suspend admin access.' },
                { label: 'Evidence requirement', value: 'Actions should be paired with actor attribution and audit event generation.' },
              ]}
            />
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
