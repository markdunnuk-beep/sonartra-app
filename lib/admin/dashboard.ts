import {
  assessmentVersions,
  assessments,
  auditLogEvents,
  getSeatUtilisationPercent,
  getStatusLabel,
  organisationMemberships,
  organisations,
  adminUsers,
} from './domain'
import { AssessmentVersion, AssessmentVersionStatus, PublishStatus } from './domain/assessments'
import { AuditAction, AuditEntityType, AuditLogEvent } from './domain/audit'
import { Organisation, OrganisationStatus } from './domain/organisations'
import { User, UserKind, UserStatus } from './domain/users'

export interface AdminDashboardMetric {
  label: string
  value: string
  detail: string
}

export interface AdminDashboardQueueItem {
  id: string
  title: string
  metric: string
  detail: string
  href: string
  tone: 'critical' | 'attention' | 'steady'
}

export interface AdminDashboardReleaseBucket {
  status: AssessmentVersionStatus
  label: string
  count: number
  detail: string
}

export interface AdminDashboardTenantHealthItem {
  organisationId: string
  organisationName: string
  plan: string
  status: string
  seatUsage: string
  seatUtilisationPercent: number
  enabledProducts: string[]
  enabledAssessmentCount: number
  recentActivityLabel: string
  statusFlags: string[]
}

export interface AdminDashboardAuditVisibility {
  publishEventsLast7Days: number
  releaseActionsLast7Days: number
  accessActionsLast7Days: number
  entityCounts: Array<{ entityType: string; label: string; count: number }>
}

export interface AdminDashboardModel {
  generatedAt: string
  overviewMetrics: AdminDashboardMetric[]
  controlQueue: AdminDashboardQueueItem[]
  releasePipeline: AdminDashboardReleaseBucket[]
  tenantHealth: AdminDashboardTenantHealthItem[]
  recentActivity: AuditLogEvent[]
  auditVisibility: AdminDashboardAuditVisibility
}

function getDashboardReferenceDate(events: AuditLogEvent[], versions: AssessmentVersion[]): Date {
  const timestamps = [
    ...events.map((event) => Date.parse(event.occurredAt)),
    ...versions.map((version) => Date.parse(version.updatedAt)),
  ].filter((value) => Number.isFinite(value))

  return new Date(Math.max(...timestamps))
}

function isWithinDays(dateValue: string | null, days: number, referenceDate: Date): boolean {
  if (!dateValue) {
    return false
  }

  const timestamp = Date.parse(dateValue)
  const diff = referenceDate.getTime() - timestamp

  return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000
}

function getDaysSince(dateValue: string | null, referenceDate: Date): number | null {
  if (!dateValue) {
    return null
  }

  const timestamp = Date.parse(dateValue)
  if (!Number.isFinite(timestamp)) {
    return null
  }

  return Math.floor((referenceDate.getTime() - timestamp) / (24 * 60 * 60 * 1000))
}

function formatRecentActivity(dateValue: string | null, referenceDate: Date): string {
  const daysSince = getDaysSince(dateValue, referenceDate)

  if (daysSince === null) {
    return 'No recent tenant activity'
  }

  if (daysSince === 0) {
    return 'Active today'
  }

  if (daysSince === 1) {
    return 'Active 1 day ago'
  }

  return `Active ${daysSince} days ago`
}

function getTenantFlags(organisation: Organisation, referenceDate: Date): string[] {
  const flags: string[] = []
  const seatUtilisation = getSeatUtilisationPercent(organisation)
  const daysSinceActivity = getDaysSince(organisation.lastActivityAt, referenceDate)

  if (organisation.status !== OrganisationStatus.Active) {
    flags.push(`${getStatusLabel(organisation.status)} posture`)
  }

  if (seatUtilisation < 60) {
    flags.push('Low seat utilisation')
  }

  if (daysSinceActivity === null || daysSinceActivity >= 21) {
    flags.push('Dormant tenant activity')
  }

  if (organisation.enabledProducts.filter((product) => product.enabled).length <= 1) {
    flags.push('Single-product enablement')
  }

  return flags
}

export function buildAdminDashboardModel({
  now = getDashboardReferenceDate(auditLogEvents, assessmentVersions),
  users = adminUsers,
  tenantOrganisations = organisations,
  versions = assessmentVersions,
  events = auditLogEvents,
}: {
  now?: Date
  users?: User[]
  tenantOrganisations?: Organisation[]
  versions?: AssessmentVersion[]
  events?: AuditLogEvent[]
} = {}): AdminDashboardModel {
  const internalAdmins = users.filter((user) => user.kind === UserKind.InternalAdmin)
  const organisationUsers = users.filter((user) => user.kind === UserKind.OrganisationUser)
  const activeOrganisations = tenantOrganisations.filter((organisation) => organisation.status === OrganisationStatus.Active)
  const liveAssessments = assessments.filter((assessment) => assessment.currentLiveVersionId !== null)
  const draftOrInProgressVersions = versions.filter((version) =>
    [AssessmentVersionStatus.Draft, AssessmentVersionStatus.InReview].includes(version.status),
  )
  const pendingReleaseItems = versions.filter((version) =>
    [AssessmentVersionStatus.Validated, AssessmentVersionStatus.InReview, AssessmentVersionStatus.Draft].includes(version.status),
  )
  const recentAuditVolume = events.filter((event) => isWithinDays(event.occurredAt, 7, now)).length

  const awaitingValidation = versions.filter((version) => version.status === AssessmentVersionStatus.InReview)
  const readyForReleaseReview = versions.filter((version) => version.status === AssessmentVersionStatus.Validated)
  const failedReleasePrep = versions.filter(
    (version) => version.validationSummary.ruleErrors > 0 || !version.validationSummary.previewReady,
  )
  const lowUtilisationOrganisations = tenantOrganisations.filter((organisation) => getSeatUtilisationPercent(organisation) < 60)
  const dormantOrganisations = tenantOrganisations.filter((organisation) => {
    const daysSince = getDaysSince(organisation.lastActivityAt, now)
    return daysSince === null || daysSince >= 21
  })
  const pendingAccessReviewUsers = users.filter(
    (user) => user.status === UserStatus.Invited || (user.kind === UserKind.InternalAdmin && user.status !== UserStatus.Active),
  )
  const auditSensitiveActions = events.filter(
    (event) =>
      [AuditEntityType.AdminAccess, AuditEntityType.Release].includes(event.entity.entityType) ||
      [AuditAction.RoleGranted, AuditAction.RoleRevoked, AuditAction.StatusChanged].includes(event.action),
  )

  const releasePipeline: AdminDashboardReleaseBucket[] = [
    {
      status: AssessmentVersionStatus.Draft,
      label: 'Draft',
      count: versions.filter((version) => version.status === AssessmentVersionStatus.Draft).length,
      detail: 'Version work started but not yet submitted into validation flow.',
    },
    {
      status: AssessmentVersionStatus.InReview,
      label: 'In review',
      count: versions.filter((version) => version.status === AssessmentVersionStatus.InReview).length,
      detail: 'Awaiting rule remediation, evidence checks, or validation sign-off.',
    },
    {
      status: AssessmentVersionStatus.Validated,
      label: 'Release review',
      count: versions.filter((version) => version.status === AssessmentVersionStatus.Validated).length,
      detail: 'Validation complete and ready for publish-window decisioning.',
    },
    {
      status: AssessmentVersionStatus.Live,
      label: 'Live',
      count: versions.filter((version) => version.status === AssessmentVersionStatus.Live).length,
      detail: 'Currently carrying customer-facing behavioural intelligence logic.',
    },
    {
      status: AssessmentVersionStatus.Archived,
      label: 'Archived',
      count: versions.filter((version) => version.status === AssessmentVersionStatus.Archived).length,
      detail: 'Historical lineage retained for audit evidence and result traceability.',
    },
  ]

  const tenantHealth = [...tenantOrganisations]
    .map<AdminDashboardTenantHealthItem>((organisation) => ({
      organisationId: organisation.id,
      organisationName: organisation.name,
      plan: getStatusLabel(organisation.plan),
      status: getStatusLabel(organisation.status),
      seatUsage: `${organisation.seatSummary.assigned}/${organisation.seatSummary.purchased}`,
      seatUtilisationPercent: getSeatUtilisationPercent(organisation),
      enabledProducts: organisation.enabledProducts.filter((product) => product.enabled).map((product) => product.label),
      enabledAssessmentCount: organisation.enabledAssessmentIds.length,
      recentActivityLabel: formatRecentActivity(organisation.lastActivityAt, now),
      statusFlags: getTenantFlags(organisation, now),
    }))
    .sort((left, right) => right.statusFlags.length - left.statusFlags.length || left.seatUtilisationPercent - right.seatUtilisationPercent)

  const entityTypeCounts = events.reduce<Record<string, number>>((counts, event) => {
    counts[event.entity.entityType] = (counts[event.entity.entityType] ?? 0) + 1
    return counts
  }, {})

  return {
    generatedAt: now.toISOString(),
    overviewMetrics: [
      {
        label: 'Active organisations',
        value: String(activeOrganisations.length).padStart(2, '0'),
        detail: `${tenantOrganisations.length} managed tenants in the Sonartra estate.`,
      },
      {
        label: 'Active users',
        value: String(users.filter((user) => user.status === UserStatus.Active).length).padStart(2, '0'),
        detail: `${organisationUsers.length} customer users and ${internalAdmins.length} Sonartra operators tracked.`,
      },
      {
        label: 'Internal admins',
        value: String(internalAdmins.length).padStart(2, '0'),
        detail: 'Privileged operators with release, access, or tenant control authority.',
      },
      {
        label: 'Live assessments',
        value: String(liveAssessments.length).padStart(2, '0'),
        detail: 'Assessment lines currently anchored to a live version identity.',
      },
      {
        label: 'Draft or in-progress versions',
        value: String(draftOrInProgressVersions.length).padStart(2, '0'),
        detail: 'Assessment versions still moving through validation and publish control.',
      },
      {
        label: 'Pending release items',
        value: String(pendingReleaseItems.length).padStart(2, '0'),
        detail: 'Work requiring review before publish state can advance or close.',
      },
      {
        label: 'Recent audit volume',
        value: String(recentAuditVolume).padStart(2, '0'),
        detail: 'Operational changes captured in the last 7 days.',
      },
    ],
    controlQueue: [
      {
        id: 'awaiting-validation',
        title: 'Assessment versions awaiting validation',
        metric: `${awaitingValidation.length}`,
        detail: awaitingValidation.length
          ? `${awaitingValidation.map((version) => version.versionNumber).join(', ')} remain in review with unresolved validation work.`
          : 'No versions are currently blocked in validation.',
        href: '/admin/assessments',
        tone: awaitingValidation.length ? 'critical' : 'steady',
      },
      {
        id: 'release-review',
        title: 'Versions ready for release review',
        metric: `${readyForReleaseReview.length}`,
        detail: readyForReleaseReview.length
          ? `${readyForReleaseReview.length} validated version${readyForReleaseReview.length === 1 ? '' : 's'} can move into publish-window review.`
          : 'No validated versions are waiting on release review.',
        href: '/admin/releases',
        tone: readyForReleaseReview.length ? 'attention' : 'steady',
      },
      {
        id: 'release-prep-failures',
        title: 'Release-prep failures or incomplete evidence',
        metric: `${failedReleasePrep.length}`,
        detail: failedReleasePrep.length
          ? `${failedReleasePrep.length} versions still show rule errors or preview readiness gaps.`
          : 'Release preparation is currently clear of blocking evidence gaps.',
        href: '/admin/releases',
        tone: failedReleasePrep.length ? 'critical' : 'steady',
      },
      {
        id: 'tenant-health',
        title: 'Tenants with low utilisation or dormant activity',
        metric: `${new Set([...lowUtilisationOrganisations, ...dormantOrganisations].map((organisation) => organisation.id)).size}`,
        detail: 'Review rollout posture where seat uptake is low or no recent tenant activity has been recorded.',
        href: '/admin/organisations',
        tone: lowUtilisationOrganisations.length || dormantOrganisations.length ? 'attention' : 'steady',
      },
      {
        id: 'access-review',
        title: 'Users pending access review',
        metric: `${pendingAccessReviewUsers.length}`,
        detail: `${pendingAccessReviewUsers.filter((user) => user.status === UserStatus.Invited).length} invited users and ${pendingAccessReviewUsers.filter((user) => user.kind === UserKind.InternalAdmin && user.status !== UserStatus.Active).length} inactive internal admins require review.`,
        href: '/admin/users',
        tone: pendingAccessReviewUsers.length ? 'attention' : 'steady',
      },
      {
        id: 'audit-sensitive',
        title: 'Audit-sensitive control changes',
        metric: `${auditSensitiveActions.filter((event) => isWithinDays(event.occurredAt, 7, now)).length}`,
        detail: 'Recent access, release, and status changes should be verified against expected control evidence.',
        href: '/admin/audit',
        tone: auditSensitiveActions.some((event) => isWithinDays(event.occurredAt, 7, now)) ? 'attention' : 'steady',
      },
    ],
    releasePipeline,
    tenantHealth,
    recentActivity: [...events].sort((left, right) => Date.parse(right.occurredAt) - Date.parse(left.occurredAt)).slice(0, 6),
    auditVisibility: {
      publishEventsLast7Days: events.filter(
        (event) => event.action === AuditAction.Published && isWithinDays(event.occurredAt, 7, now),
      ).length,
      releaseActionsLast7Days: events.filter(
        (event) => [AuditEntityType.Release, AuditEntityType.AssessmentVersion].includes(event.entity.entityType) && isWithinDays(event.occurredAt, 7, now),
      ).length,
      accessActionsLast7Days: events.filter(
        (event) => [AuditEntityType.AdminAccess, AuditEntityType.Membership, AuditEntityType.User].includes(event.entity.entityType) && isWithinDays(event.occurredAt, 7, now),
      ).length,
      entityCounts: Object.entries(entityTypeCounts)
        .map(([entityType, count]) => ({ entityType, label: getStatusLabel(entityType), count }))
        .sort((left, right) => right.count - left.count),
    },
  }
}

export const adminDashboardModel = buildAdminDashboardModel()

export function getReleasePublishStateSummary(versions: AssessmentVersion[]) {
  return versions.reduce<Record<PublishStatus, number>>(
    (counts, version) => {
      counts[version.publishStatus] += 1
      return counts
    },
    {
      [PublishStatus.Unpublished]: 0,
      [PublishStatus.Scheduled]: 0,
      [PublishStatus.Published]: 0,
      [PublishStatus.Paused]: 0,
      [PublishStatus.RolledBack]: 0,
    },
  )
}

export function getOrganisationSeatFootprintSummary(tenantOrganisations: Organisation[]) {
  return tenantOrganisations.reduce(
    (summary, organisation) => {
      summary.purchased += organisation.seatSummary.purchased
      summary.assigned += organisation.seatSummary.assigned
      summary.invited += organisation.seatSummary.invited
      return summary
    },
    { purchased: 0, assigned: 0, invited: 0 },
  )
}

export function getPendingMembershipInvites() {
  return organisationMemberships.filter((membership) => membership.joinedAt === null)
}
