import { getStatusLabel } from './helpers'
import { OrganisationRole } from './organisations'
import { getAdminRoleDefinition, InternalAdminRole } from './roles'
import { User, UserKind, UserStatus } from './users'
import { AccessQuery } from './access-query'
import { AdminAccessRegistryDomainData, DEFAULT_ADMIN_ACCESS_REGISTRY_DATA } from './access-registry'

function getUserMemberships(userId: string, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA) {
  return data.memberships.filter((membership) => membership.userId === userId)
}

function getAccessReferenceDate(data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): Date {
  const timestamps = [
    ...data.auditEvents.map((event) => Date.parse(event.occurredAt)),
    ...data.organisations.map((organisation) => Date.parse(organisation.updatedAt)),
    ...data.users.map((user) => Date.parse(user.updatedAt)),
  ].filter((value) => Number.isFinite(value))

  return new Date(timestamps.length ? Math.max(...timestamps) : Date.now())
}

function getDaysSince(value: string | null, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA, referenceDate: Date = getAccessReferenceDate(data)): number | null {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    return null
  }

  return Math.floor((referenceDate.getTime() - timestamp) / (24 * 60 * 60 * 1000))
}

function getNormalisedActivityBand(user: User, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): NonNullable<AccessQuery['activityBand']>[number] {
  const daysSinceActivity = getDaysSince(user.recentActivity.lastActiveAt, data)

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

function getUserRoleLabel(user: User, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): string {
  const memberships = getUserMemberships(user.id, data)

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

function hasRiskFlag(user: User, riskFlag: NonNullable<AccessQuery['riskFlags']>[number], data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): boolean {
  const membershipCount = getUserMemberships(user.id, data).length
  const activityBand = getNormalisedActivityBand(user, data)

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

function matchesSearch(user: User, search: string | undefined, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): boolean {
  const query = search?.trim().toLowerCase()

  if (!query) {
    return true
  }

  const memberships = getUserMemberships(user.id, data)
  const organisationNames = memberships
    .map((membership) => data.organisations.find((organisation) => organisation.id === membership.organisationId)?.name)
    .filter((name): name is string => Boolean(name))
  const membershipRoles = memberships.map((membership) => getStatusLabel(membership.role))
  const haystack = [
    user.profile.fullName,
    user.profile.firstName,
    user.profile.lastName,
    user.email,
    user.profile.title,
    getUserRoleLabel(user, data),
    user.internalAdminRole,
    ...organisationNames,
    ...membershipRoles,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

export function matchesScope(user: User, scope: AccessQuery['scope'] = 'all', data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): boolean {
  if (!scope || scope === 'all') {
    return true
  }

  if (scope === 'internal') {
    return user.kind === UserKind.InternalAdmin
  }

  if (scope === 'organisation') {
    return user.kind === UserKind.OrganisationUser
  }

  return getUserMemberships(user.id, data).length > 1
}

export function matchesRole(user: User, roleTypes: string[] | undefined, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): boolean {
  if (!roleTypes?.length) {
    return true
  }

  const userRoles = new Set<string>()

  if (user.internalAdminRole) {
    userRoles.add(user.internalAdminRole)
  }

  getUserMemberships(user.id, data).forEach((membership) => userRoles.add(membership.role))

  return roleTypes.some((roleType) => userRoles.has(roleType))
}

export function matchesStatus(user: User, statuses?: AccessQuery['status']): boolean {
  if (!statuses?.length) {
    return true
  }

  return statuses.includes(normaliseStatus(user))
}

export function matchesActivity(user: User, activityBand: AccessQuery['activityBand'] | undefined, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): boolean {
  if (!activityBand?.length) {
    return true
  }

  return activityBand.includes(getNormalisedActivityBand(user, data))
}

export function matchesRisk(user: User, riskFlags: AccessQuery['riskFlags'] | undefined, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): boolean {
  if (!riskFlags?.length) {
    return true
  }

  return riskFlags.some((riskFlag) => hasRiskFlag(user, riskFlag, data))
}

export function filterUsersByQuery(users: User[], query: AccessQuery, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): User[] {
  return users.filter((user) => (
    matchesSearch(user, query.search, data)
    && matchesScope(user, query.scope, data)
    && matchesRole(user, query.roleTypes, data)
    && matchesStatus(user, query.status)
    && matchesActivity(user, query.activityBand, data)
    && matchesRisk(user, query.riskFlags, data)
  ))
}

export function getUserRoleTypes(user: User, data: AdminAccessRegistryDomainData = DEFAULT_ADMIN_ACCESS_REGISTRY_DATA): string[] {
  const roleTypes = new Set<string>()

  if (user.internalAdminRole) {
    roleTypes.add(user.internalAdminRole)
  }

  getUserMemberships(user.id, data).forEach((membership) => roleTypes.add(membership.role))

  return [...roleTypes]
}

export function isElevatedAccessRole(roleType: string): boolean {
  return roleType === InternalAdminRole.SuperAdmin || roleType === OrganisationRole.Owner || roleType === OrganisationRole.Admin
}
