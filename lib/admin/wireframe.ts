import {
  Assessment,
  AssessmentVersion,
  AssessmentVersionStatus,
  AuditLogEvent,
  InternalAdminRole,
  Organisation,
  OrganisationMembership,
  OrganisationRole,
  PublishStatus,
  User,
  UserKind,
  UserStatus,
  adminUsers,
  assessmentVersions,
  assessments,
  auditLogEvents,
  getAdminRoleDefinition,
  getAssessmentVersionCounts,
  getCurrentLiveAssessmentVersion,
  getSeatUtilisationPercent,
  getStatusLabel,
  organisationMemberships,
  organisations,
  type AdminAccessRegistryDomainData,
  DEFAULT_ADMIN_ACCESS_REGISTRY_DATA,
} from './domain'

export interface AdminTabItem {
  label: string
  href?: string
  current?: boolean
  count?: string | number
}

export interface AdminValidationIssue {
  label: string
  state: 'pass' | 'warning' | 'error'
  detail: string
}

export interface OrganisationHealthSignal {
  label: string
  tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet'
}

export interface OrganisationMembershipSummary {
  totalUsers: number
  adminUsers: number
  memberUsers: number
  invitedUsers: number
  inactiveUsers: number
}

export interface UserAccessSignal {
  label: string
  tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet'
}

export interface UserRoleSummary {
  label: string
  scope: 'internal' | 'organisation'
  tone: 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' | 'violet'
}

export type UserActivityBand = 'active' | 'recent' | 'watch' | 'inactive' | 'none'

function getAdminReferenceDate(): Date {
  const timestamps = [
    ...auditLogEvents.map((event) => Date.parse(event.occurredAt)),
    ...assessmentVersions.map((version) => Date.parse(version.updatedAt)),
    ...organisations.map((organisation) => Date.parse(organisation.updatedAt)),
  ].filter((value) => Number.isFinite(value))

  return new Date(Math.max(...timestamps))
}

function getDaysSince(value: string | null, referenceDate: Date = getAdminReferenceDate()): number | null {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) {
    return null
  }

  return Math.floor((referenceDate.getTime() - timestamp) / (24 * 60 * 60 * 1000))
}

export function formatAdminTimestamp(value: string | null): string {
  if (!value) {
    return 'Not available'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
    hour12: false,
  }).format(date).replace(',', ' ·') + ' UTC'
}

export function formatShortAdminDate(value: string | null): string {
  if (!value) {
    return 'Not scheduled'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatAdminRelativeTime(value: string | null, referenceDate: Date = getAdminReferenceDate()): string {
  const daysSince = getDaysSince(value, referenceDate)

  if (daysSince === null) {
    return 'No activity'
  }

  if (daysSince === 0) {
    return 'Today'
  }

  if (daysSince === 1) {
    return '1 day ago'
  }

  if (daysSince < 7) {
    return `${daysSince} days ago`
  }

  const weeksSince = Math.floor(daysSince / 7)
  if (weeksSince < 5) {
    return `${weeksSince} week${weeksSince === 1 ? '' : 's'} ago`
  }

  const monthsSince = Math.floor(daysSince / 30)
  return `${monthsSince} month${monthsSince === 1 ? '' : 's'} ago`
}

export function findOrganisationBySlug(slug: string): Organisation | null {
  return organisations.find((organisation) => organisation.slug === slug) ?? null
}

export function findUserById(userId: string, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): User | null {
  return data.users.find((user) => user.id === userId) ?? null
}

export function findAssessmentBySlug(slug: string): Assessment | null {
  return assessments.find((assessment) => assessment.slug === slug) ?? null
}

export function findAssessmentVersion(assessmentSlug: string, versionNumber: string): AssessmentVersion | null {
  const assessment = findAssessmentBySlug(assessmentSlug)

  if (!assessment) {
    return null
  }

  return assessmentVersions.find((version) => version.assessmentId === assessment.id && version.versionNumber === versionNumber) ?? null
}

export function getOrganisationMemberships(organisationId: string): OrganisationMembership[] {
  return organisationMemberships.filter((membership) => membership.organisationId === organisationId)
}

export function getOrganisationUsers(organisationId: string): User[] {
  const membershipUserIds = new Set(
    organisationMemberships.filter((membership) => membership.organisationId === organisationId).map((membership) => membership.userId),
  )

  return adminUsers.filter((user) => membershipUserIds.has(user.id))
}

export function getUserMemberships(userId: string, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): OrganisationMembership[] {
  return data.memberships.filter((membership) => membership.userId === userId)
}

export function getAssessmentVersionsForAssessment(assessmentId: string): AssessmentVersion[] {
  return assessmentVersions.filter((version) => version.assessmentId === assessmentId)
}

export function getAssessmentAuditEvents(assessmentId: string): AuditLogEvent[] {
  const versions = getAssessmentVersionsForAssessment(assessmentId)
  const versionIds = new Set(versions.map((version) => version.id))

  return auditLogEvents.filter((event) => event.entity.entityId === assessmentId || versionIds.has(event.entity.entityId))
}

export function getEntityAuditEvents(entityIds: string[], dataSource: Pick<AdminAccessRegistryDomainData, 'auditEvents'> = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): AuditLogEvent[] {
  const entityIdSet = new Set(entityIds)

  return dataSource.auditEvents.filter((event) => entityIdSet.has(event.entity.entityId))
}

export function getOrganisationAuditEvents(organisationId: string): AuditLogEvent[] {
  const membershipIds = getOrganisationMemberships(organisationId).map((membership) => membership.id)

  return getEntityAuditEvents([organisationId, ...membershipIds])
}

export function getVersionAuditEvents(versionId: string): AuditLogEvent[] {
  return getEntityAuditEvents([versionId])
}

export function getOrganisationSummary(organisation: Organisation) {
  const memberships = getOrganisationMemberships(organisation.id)
  const users = getOrganisationUsers(organisation.id)
  const contact = organisation.primaryContactUserId ? findUserById(organisation.primaryContactUserId) : null
  const enabledProducts = organisation.enabledProducts.filter((product) => product.enabled)

  return {
    memberships,
    users,
    contact,
    enabledProducts,
    seatUtilisation: getSeatUtilisationPercent(organisation),
  }
}

export function getOrganisationUtilisationBand(organisation: Organisation): 'low' | 'medium' | 'high' {
  const utilisation = getSeatUtilisationPercent(organisation)

  if (utilisation < 60) {
    return 'low'
  }

  if (utilisation < 85) {
    return 'medium'
  }

  return 'high'
}

export function getOrganisationMembershipSummary(organisation: Organisation): OrganisationMembershipSummary {
  const memberships = getOrganisationMemberships(organisation.id)
  const users = getOrganisationUsers(organisation.id)

  return {
    totalUsers: users.length,
    adminUsers: memberships.filter((membership) => ['owner', 'admin'].includes(membership.role)).length,
    memberUsers: memberships.filter((membership) => ['manager', 'member', 'analyst'].includes(membership.role)).length,
    invitedUsers: users.filter((user) => user.status === 'invited').length,
    inactiveUsers: users.filter((user) => ['suspended', 'deactivated'].includes(user.status)).length,
  }
}

export function getOrganisationVersionExposure(organisation: Organisation): string[] {
  return organisation.enabledAssessmentIds.map((assessmentId) => {
    const assessment = assessments.find((item) => item.id === assessmentId)

    if (!assessment) {
      return assessmentId
    }

    const liveVersion = getCurrentLiveAssessmentVersion(assessment, getAssessmentVersionsForAssessment(assessment.id))

    return `${assessment.title}${liveVersion ? ` v${liveVersion.versionNumber}` : ''}`
  })
}

export function getOrganisationHealthSignals(organisation: Organisation, referenceDate: Date = getAdminReferenceDate()): OrganisationHealthSignal[] {
  const signals: OrganisationHealthSignal[] = []
  const seatUtilisation = getSeatUtilisationPercent(organisation)
  const daysSinceActivity = getDaysSince(organisation.lastActivityAt, referenceDate)

  if (organisation.status === 'suspended') {
    signals.push({ label: 'Suspended', tone: 'rose' })
  }

  if (organisation.status === 'implementation') {
    signals.push({ label: 'Implementation', tone: 'amber' })
  }

  if (seatUtilisation < 60) {
    signals.push({ label: 'Low utilisation', tone: 'amber' })
  }

  if (daysSinceActivity === null || daysSinceActivity >= 21) {
    signals.push({ label: 'Dormant', tone: 'amber' })
  }

  if (organisation.enabledAssessmentIds.length === 0) {
    signals.push({ label: 'No assessments', tone: 'rose' })
  }

  return signals
}

export function getUserSummary(user: User, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA) {
  const memberships = getUserMemberships(user.id, data)
  const primaryOrganisation = user.primaryOrganisationId ? data.organisations.find((organisation) => organisation.id === user.primaryOrganisationId) ?? null : null

  return {
    memberships,
    primaryOrganisation,
    auditEvents: getEntityAuditEvents([user.id, ...memberships.map((membership) => membership.id)], data),
  }
}

export function getUserActivityBand(user: User, referenceDate: Date = getAdminReferenceDate(), _data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): UserActivityBand {
  const daysSinceActivity = getDaysSince(user.recentActivity.lastActiveAt, referenceDate)

  if (daysSinceActivity === null) {
    return 'none'
  }

  if (daysSinceActivity <= 1) {
    return 'active'
  }

  if (daysSinceActivity <= 7) {
    return 'recent'
  }

  if (daysSinceActivity <= 21) {
    return 'watch'
  }

  return 'inactive'
}

export function getUserRoleSummary(user: User, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): UserRoleSummary {
  const memberships = getUserMemberships(user.id, data)

  if (user.kind === UserKind.InternalAdmin && user.internalAdminRole) {
    const definition = getAdminRoleDefinition(user.internalAdminRole)

    return {
      label: definition.label,
      scope: 'internal',
      tone: user.internalAdminRole === InternalAdminRole.SuperAdmin ? 'rose' : toneForInternalRole(user.internalAdminRole),
    }
  }

  const primaryMembership = memberships.find((membership) => membership.organisationId === user.primaryOrganisationId) ?? memberships[0] ?? null

  if (!primaryMembership) {
    return { label: 'No assigned role', scope: 'organisation', tone: 'slate' }
  }

  return {
    label: getStatusLabel(primaryMembership.role),
    scope: 'organisation',
    tone: toneForOrganisationRole(primaryMembership.role),
  }
}

export function getUserAccessSignals(user: User, referenceDate: Date = getAdminReferenceDate(), data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): UserAccessSignal[] {
  const summary = getUserSummary(user, data)
  const signals: UserAccessSignal[] = []
  const activityBand = getUserActivityBand(user, referenceDate, data)
  const roleSummary = getUserRoleSummary(user, data)

  if (user.status === UserStatus.Invited && !user.externalAuthId) {
    signals.push({ label: 'Invite pending', tone: 'amber' })
  }

  if (user.kind === UserKind.InternalAdmin && user.status !== UserStatus.Active) {
    signals.push({ label: 'Internal review', tone: 'rose' })
  }

  if (activityBand === 'inactive') {
    signals.push({ label: 'No recent activity', tone: 'amber' })
  }

  if (activityBand === 'none' && user.status !== UserStatus.Invited) {
    signals.push({ label: 'Never active', tone: 'amber' })
  }

  if (summary.memberships.length > 1) {
    signals.push({ label: 'Multi-org access', tone: 'violet' })
  }

  if (user.kind === UserKind.InternalAdmin && user.internalAdminRole === InternalAdminRole.SuperAdmin) {
    signals.push({ label: 'Elevated access', tone: 'rose' })
  }

  if (user.kind === UserKind.OrganisationUser && roleSummary.label === getStatusLabel(OrganisationRole.Owner)) {
    signals.push({ label: 'Org owner', tone: 'sky' })
  }

  return signals
}

export function getUserAccessHistory(user: User, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA) {
  const summary = getUserSummary(user, data)

  return summary.auditEvents.filter((event) =>
    ['user', 'membership', 'admin_access'].includes(event.entity.entityType),
  )
}

function toneForInternalRole(role: InternalAdminRole): UserAccessSignal['tone'] {
  switch (role) {
    case InternalAdminRole.SuperAdmin:
      return 'rose'
    case InternalAdminRole.PlatformAdmin:
      return 'sky'
    case InternalAdminRole.AssessmentAdmin:
      return 'violet'
    case InternalAdminRole.CustomerSuccessAdmin:
      return 'emerald'
    case InternalAdminRole.SupportAdmin:
      return 'amber'
  }
}

function toneForOrganisationRole(role: OrganisationRole): UserAccessSignal['tone'] {
  switch (role) {
    case OrganisationRole.Owner:
      return 'sky'
    case OrganisationRole.Admin:
      return 'violet'
    case OrganisationRole.Manager:
      return 'emerald'
    case OrganisationRole.Analyst:
      return 'amber'
    case OrganisationRole.Member:
      return 'slate'
  }
}

export function getAssessmentSummary(assessment: Assessment) {
  const versions = getAssessmentVersionsForAssessment(assessment.id)
  const liveVersion = getCurrentLiveAssessmentVersion(assessment, versions)
  const versionCounts = getAssessmentVersionCounts(assessment.id, versions)
  const owner = findUserById(assessment.ownerUserId)
  const enabledTenants = organisations.filter((organisation) => assessment.enabledOrganisationIds.includes(organisation.id))

  return {
    versions,
    liveVersion,
    versionCounts,
    owner,
    enabledTenants,
    auditEvents: getAssessmentAuditEvents(assessment.id),
  }
}

export function getValidationIssues(version: AssessmentVersion): AdminValidationIssue[] {
  return [
    {
      label: 'Schema integrity',
      state: version.validationSummary.ruleErrors > 0 ? 'error' : 'pass',
      detail:
        version.validationSummary.ruleErrors > 0
          ? `${version.validationSummary.ruleErrors} structural rule issue${version.validationSummary.ruleErrors === 1 ? '' : 's'} must be remediated before release.`
          : 'Question groups, identifiers, and scoring keys align with the expected import contract.',
    },
    {
      label: 'Interpretation coverage',
      state: version.validationSummary.ruleWarnings > 0 ? 'warning' : 'pass',
      detail:
        version.validationSummary.ruleWarnings > 0
          ? `${version.validationSummary.ruleWarnings} warning-level interpretation mapping issue${version.validationSummary.ruleWarnings === 1 ? '' : 's'} require review before publish.`
          : 'Interpretation narratives are fully covered.',
    },
    {
      label: 'Preview package',
      state: version.validationSummary.previewReady ? 'pass' : 'error',
      detail: version.validationSummary.previewReady ? 'Preview package generated successfully.' : 'Preview package blocked until structural issues are resolved.',
    },
  ]
}

export function getReleaseBlockers(version: AssessmentVersion): string[] {
  return [
    version.validationSummary.ruleErrors > 0 ? 'Rule errors remain unresolved.' : null,
    !version.validationSummary.previewReady ? 'Preview bundle has not been generated.' : null,
    version.status !== AssessmentVersionStatus.Validated && version.publishStatus !== PublishStatus.Published ? 'Validation sign-off not yet complete.' : null,
  ].filter(Boolean) as string[]
}

export function getVersionReleaseSteps(version: AssessmentVersion) {
  return [
    {
      label: 'Draft baseline',
      state: 'complete',
      detail: `Version scaffolded by ${version.createdBy.displayName}.`,
    },
    {
      label: 'Validation review',
      state: version.status === AssessmentVersionStatus.Draft ? 'current' : 'complete',
      detail: `${version.validationSummary.ruleErrors} errors · ${version.validationSummary.ruleWarnings} warnings.`,
    },
    {
      label: 'Preview approval',
      state:
        version.validationSummary.previewReady
          ? version.status === AssessmentVersionStatus.Validated || version.status === AssessmentVersionStatus.Live
            ? 'complete'
            : 'current'
          : 'blocked',
      detail: version.validationSummary.previewReady ? 'Preview bundle available for release reviewers.' : 'Preview bundle blocked until structural issues are resolved.',
    },
    {
      label: 'Publish decision',
      state:
        [AssessmentVersionStatus.Live].includes(version.status) || version.publishStatus === PublishStatus.Published
          ? 'complete'
          : version.status === AssessmentVersionStatus.Validated
            ? 'current'
            : 'pending',
      detail: getStatusLabel(version.publishStatus),
    },
  ]
}

export function getAssessmentTabs(assessment: Assessment, current: 'overview' | 'version' | 'new' = 'overview', version?: AssessmentVersion): AdminTabItem[] {
  const summary = getAssessmentSummary(assessment)

  return [
    { label: 'Overview', href: `/admin/assessments/${assessment.slug}`, current: current === 'overview' },
    {
      label: 'Versions',
      href: version ? `/admin/assessments/${assessment.slug}/versions/${version.versionNumber}` : `/admin/assessments/${assessment.slug}`,
      current: current === 'version',
      count: summary.versions.length,
    },
    { label: 'New / Import', href: '/admin/assessments/new', current: current === 'new' },
  ]
}

export function getDashboardPrimaryRelease(): { assessment: Assessment; version: AssessmentVersion } | null {
  const version = assessmentVersions.find((item) => item.status === AssessmentVersionStatus.Validated) ?? assessmentVersions[0]
  const assessment = assessments.find((item) => item.id === version?.assessmentId)

  if (!version || !assessment) {
    return null
  }

  return { assessment, version }
}

export function getKindLabel(user: User): string {
  return user.kind === UserKind.InternalAdmin ? 'Internal Sonartra admin' : 'Customer organisation user'
}
