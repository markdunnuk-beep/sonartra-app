import { getStatusLabel } from './helpers'
import { auditLogEvents, assessmentVersions, organisations, organisationMemberships } from './mock-data'
import { OrganisationRole } from './organisations'
import { getAdminRoleDefinition, InternalAdminRole } from './roles'
import { User, UserKind, UserStatus } from './users'
import { AccessQuery } from './access-query'

function getUserMemberships(userId: string) {
  return organisationMemberships.filter((membership) => membership.userId === userId)
}

function getAccessReferenceDate(): Date {
  const timestamps = [
    ...auditLogEvents.map((event) => Date.parse(event.occurredAt)),
    ...assessmentVersions.map((version) => Date.parse(version.updatedAt)),
    ...organisations.map((organisation) => Date.parse(organisation.updatedAt)),
  ].filter((value) => Number.isFinite(value))

  return new Date(Math.max(...timestamps))
}

function getDaysSince(value: string | null, referenceDate: Date = getAccessReferenceDate()): number | null {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    return null
  }

  return Math.floor((referenceDate.getTime() - timestamp) / (24 * 60 * 60 * 1000))
}

function getNormalisedActivityBand(user: User): NonNullable<AccessQuery['activityBand']>[number] {
  const daysSinceActivity = getDaysSince(user.recentActivity.lastActiveAt)

  if (daysSinceActivity === null) {
    return 'inactive'
  }

  if (daysSinceActivity <= 1) {
    return 'active_now'
  }

  if (daysSinceActivity <= 21) {
    return 'recent'
  }

  return 'inactive'
}

function getUserRoleLabel(user: User): string {
  const memberships = getUserMemberships(user.id)

  if (user.kind === UserKind.InternalAdmin && user.internalAdminRole) {
    return getAdminRoleDefinition(user.internalAdminRole).label
  }

  const primaryMembership = memberships.find((membership) => membership.organisationId === user.primaryOrganisationId) ?? memberships[0] ?? null

  return primaryMembership ? getStatusLabel(primaryMembership.role) : 'No assigned role'
}

function normaliseStatus(user: User): NonNullable<AccessQuery['status']>[number] {
  switch (user.status) {
    case UserStatus.Deactivated:
      return 'inactive'
    case UserStatus.Active:
      return 'active'
    case UserStatus.Suspended:
      return 'suspended'
    case UserStatus.Invited:
      return 'invited'
  }
}

function hasRiskFlag(user: User, riskFlag: NonNullable<AccessQuery['riskFlags']>[number]): boolean {
  const membershipCount = getUserMemberships(user.id).length
  const activityBand = getNormalisedActivityBand(user)

  switch (riskFlag) {
    case 'elevated_access':
      return user.kind === UserKind.InternalAdmin && user.internalAdminRole === InternalAdminRole.SuperAdmin
    case 'multi_org':
      return membershipCount > 1
    case 'invite_pending':
      return user.status === UserStatus.Invited && !user.externalAuthId
    case 'internal_review':
      return user.kind === UserKind.InternalAdmin && user.status !== UserStatus.Active
    case 'no_recent_activity':
      return activityBand === 'inactive'
  }
}

function matchesSearch(user: User, search?: string): boolean {
  const query = search?.trim().toLowerCase()

  if (!query) {
    return true
  }

  const memberships = getUserMemberships(user.id)
  const organisationNames = memberships
    .map((membership) => organisations.find((organisation) => organisation.id === membership.organisationId)?.name)
    .filter((name): name is string => Boolean(name))
  const membershipRoles = memberships.map((membership) => getStatusLabel(membership.role))
  const haystack = [
    user.profile.fullName,
    user.profile.firstName,
    user.profile.lastName,
    user.email,
    user.profile.title,
    getUserRoleLabel(user),
    user.internalAdminRole,
    ...organisationNames,
    ...membershipRoles,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

export function matchesScope(user: User, scope: AccessQuery['scope'] = 'all'): boolean {
  if (!scope || scope === 'all') {
    return true
  }

  if (scope === 'internal') {
    return user.kind === UserKind.InternalAdmin
  }

  if (scope === 'organisation') {
    return user.kind === UserKind.OrganisationUser
  }

  return getUserMemberships(user.id).length > 1
}

export function matchesRole(user: User, roleTypes?: string[]): boolean {
  if (!roleTypes?.length) {
    return true
  }

  const userRoles = new Set<string>()

  if (user.internalAdminRole) {
    userRoles.add(user.internalAdminRole)
  }

  getUserMemberships(user.id).forEach((membership) => userRoles.add(membership.role))

  return roleTypes.some((roleType) => userRoles.has(roleType))
}

export function matchesStatus(user: User, statuses?: AccessQuery['status']): boolean {
  if (!statuses?.length) {
    return true
  }

  return statuses.includes(normaliseStatus(user))
}

export function matchesActivity(user: User, activityBand?: AccessQuery['activityBand']): boolean {
  if (!activityBand?.length) {
    return true
  }

  return activityBand.includes(getNormalisedActivityBand(user))
}

export function matchesRisk(user: User, riskFlags?: AccessQuery['riskFlags']): boolean {
  if (!riskFlags?.length) {
    return true
  }

  return riskFlags.some((riskFlag) => hasRiskFlag(user, riskFlag))
}

export function filterUsersByQuery(users: User[], query: AccessQuery): User[] {
  return users.filter((user) => (
    matchesSearch(user, query.search)
    && matchesScope(user, query.scope)
    && matchesRole(user, query.roleTypes)
    && matchesStatus(user, query.status)
    && matchesActivity(user, query.activityBand)
    && matchesRisk(user, query.riskFlags)
  ))
}

export function getUserRoleTypes(user: User): string[] {
  const roleTypes = new Set<string>()

  if (user.internalAdminRole) {
    roleTypes.add(user.internalAdminRole)
  }

  getUserMemberships(user.id).forEach((membership) => roleTypes.add(membership.role))

  return [...roleTypes]
}

export function isElevatedAccessRole(roleType: string): boolean {
  return roleType === InternalAdminRole.SuperAdmin || roleType === OrganisationRole.Owner || roleType === OrganisationRole.Admin
}
