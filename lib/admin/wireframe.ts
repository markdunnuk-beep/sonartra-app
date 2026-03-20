import {
  Assessment,
  AssessmentVersion,
  AssessmentVersionStatus,
  AuditLogEvent,
  Organisation,
  OrganisationMembership,
  PublishStatus,
  User,
  UserKind,
  adminUsers,
  assessmentVersions,
  assessments,
  auditLogEvents,
  getAssessmentVersionCounts,
  getCurrentLiveAssessmentVersion,
  getSeatUtilisationPercent,
  getStatusLabel,
  organisationMemberships,
  organisations,
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

export function findOrganisationBySlug(slug: string): Organisation | null {
  return organisations.find((organisation) => organisation.slug === slug) ?? null
}

export function findUserById(userId: string): User | null {
  return adminUsers.find((user) => user.id === userId) ?? null
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
  return adminUsers.filter((user) => user.primaryOrganisationId === organisationId)
}

export function getUserMemberships(userId: string): OrganisationMembership[] {
  return organisationMemberships.filter((membership) => membership.userId === userId)
}

export function getAssessmentVersionsForAssessment(assessmentId: string): AssessmentVersion[] {
  return assessmentVersions.filter((version) => version.assessmentId === assessmentId)
}

export function getAssessmentAuditEvents(assessmentId: string): AuditLogEvent[] {
  const versions = getAssessmentVersionsForAssessment(assessmentId)
  const versionIds = new Set(versions.map((version) => version.id))

  return auditLogEvents.filter((event) => event.entity.entityId === assessmentId || versionIds.has(event.entity.entityId))
}

export function getEntityAuditEvents(entityIds: string[]): AuditLogEvent[] {
  const entityIdSet = new Set(entityIds)

  return auditLogEvents.filter((event) => entityIdSet.has(event.entity.entityId))
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

export function getUserSummary(user: User) {
  const memberships = getUserMemberships(user.id)
  const primaryOrganisation = user.primaryOrganisationId ? organisations.find((organisation) => organisation.id === user.primaryOrganisationId) ?? null : null

  return {
    memberships,
    primaryOrganisation,
    auditEvents: getEntityAuditEvents([user.id, ...memberships.map((membership) => membership.id)]),
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
