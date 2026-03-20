import {
  AuditAction,
  AuditEntityType,
  AuditLogEvent,
  type AdminAccessRegistryDomainData,
  type Organisation,
  type OrganisationMembership,
  OrganisationPlan,
  OrganisationRole,
  OrganisationStatus,
  type User,
  UserKind,
  UserStatus,
} from '@/lib/admin/domain'
import { InternalAdminRole } from '@/lib/admin/domain/roles'
import type { AdminAccessAuditEventDTO, AdminAccessIdentityDTO, AdminAccessIdentityRoleDTO, AdminAccessMembershipDTO } from './access-registry'

const INTERNAL_ROLE_PRIORITY: InternalAdminRole[] = [
  InternalAdminRole.SuperAdmin,
  InternalAdminRole.PlatformAdmin,
  InternalAdminRole.AssessmentAdmin,
  InternalAdminRole.CustomerSuccessAdmin,
  InternalAdminRole.SupportAdmin,
]

const INTERNAL_ROLE_SET = new Set<string>(INTERNAL_ROLE_PRIORITY)
const ORGANISATION_ROLE_SET = new Set<string>(Object.values(OrganisationRole))
const IDENTITY_TYPE_TO_USER_KIND: Record<AdminAccessIdentityDTO['identityType'], UserKind> = {
  internal: UserKind.InternalAdmin,
  organisation: UserKind.OrganisationUser,
}

type TimestampInput = string | Date | null | undefined

function logAccessRegistryInvariant(message: string, details?: Record<string, unknown>) {
  console.error(`[admin-access-registry-mapper] ${message}`, details ?? {})
}

function ensureArray<T>(value: T[] | null | undefined): T[] {
  return Array.isArray(value) ? value : []
}

function normaliseTimestamp(value: TimestampInput): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    const timestamp = Date.parse(value)
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  return null
}

function normaliseRequiredString(value: string | null | undefined, fieldName: string, details?: Record<string, unknown>): string | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    logAccessRegistryInvariant(`Missing required ${fieldName} while mapping admin access DTO.`, details)
    return null
  }

  return trimmed
}

function normaliseOptionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function parseName(fullName: string): { firstName: string; lastName: string } {
  const [firstName = fullName, ...rest] = fullName.trim().split(/\s+/)

  return {
    firstName,
    lastName: rest.join(' '),
  }
}

function mapUserStatus(status: AdminAccessIdentityDTO['status'] | string | null | undefined): UserStatus {
  switch (status) {
    case 'active':
      return UserStatus.Active
    case 'inactive':
      return UserStatus.Deactivated
    case 'suspended':
      return UserStatus.Suspended
    case 'invited':
      return UserStatus.Invited
    default:
      logAccessRegistryInvariant('Unexpected identity status encountered during admin access mapping.', { status })
      return UserStatus.Deactivated
  }
}

function mapOrganisationStatus(status: string | null | undefined): OrganisationStatus {
  switch (status) {
    case 'suspended':
      return OrganisationStatus.Suspended
    case 'implementation':
      return OrganisationStatus.Implementation
    case 'trial':
      return OrganisationStatus.Trial
    case 'prospect':
      return OrganisationStatus.Prospect
    case 'churned':
      return OrganisationStatus.Churned
    case 'active':
    case 'inactive':
    case 'invited':
    case undefined:
    case null:
      return OrganisationStatus.Active
    default:
      logAccessRegistryInvariant('Unexpected organisation status encountered during admin access mapping.', { status })
      return OrganisationStatus.Active
  }
}

function mapIdentityTypeToUserKind(identityType: AdminAccessIdentityDTO['identityType'] | string | null | undefined): UserKind {
  if (identityType === 'internal' || identityType === 'organisation') {
    return IDENTITY_TYPE_TO_USER_KIND[identityType]
  }

  logAccessRegistryInvariant('Unexpected identity type encountered during admin access mapping.', { identityType })
  return UserKind.OrganisationUser
}

function getSafeRoles(dto: AdminAccessIdentityDTO): AdminAccessIdentityRoleDTO[] {
  return ensureArray(dto.roles).flatMap((role) => {
    const key = normaliseRequiredString(role?.key, 'role.key', { identityId: dto.id, role })
    const label = normaliseRequiredString(role?.label, 'role.label', { identityId: dto.id, role })

    if (!key || !label) {
      return []
    }

    return [{
      key,
      label,
      organisationId: normaliseOptionalString(role.organisationId),
    }]
  })
}

function getSafeMemberships(dto: AdminAccessIdentityDTO): AdminAccessMembershipDTO[] {
  return ensureArray(dto.memberships).flatMap((membership) => {
    const organisationId = normaliseRequiredString(membership?.organisationId, 'membership.organisationId', { identityId: dto.id, membership })
    const organisationName = normaliseRequiredString(membership?.organisationName, 'membership.organisationName', { identityId: dto.id, membership })
    const membershipRole = normaliseRequiredString(membership?.membershipRole, 'membership.membershipRole', { identityId: dto.id, membership })
    const membershipStatus = normaliseRequiredString(membership?.membershipStatus, 'membership.membershipStatus', { identityId: dto.id, membership })

    if (!organisationId || !organisationName || !membershipRole || !membershipStatus) {
      return []
    }

    return [{
      organisationId,
      organisationName,
      organisationSlug: normaliseOptionalString(membership.organisationSlug),
      organisationCountry: normaliseOptionalString(membership.organisationCountry),
      organisationStatus: normaliseOptionalString(membership.organisationStatus),
      organisationCreatedAt: normaliseTimestamp(membership.organisationCreatedAt),
      membershipRole,
      membershipStatus,
      joinedAt: normaliseTimestamp(membership.joinedAt),
      invitedAt: normaliseTimestamp(membership.invitedAt),
      lastActivityAt: normaliseTimestamp(membership.lastActivityAt),
    }]
  })
}

function getSafeAuditEvents(dto: AdminAccessIdentityDTO): AdminAccessAuditEventDTO[] {
  return ensureArray(dto.auditEvents).flatMap((event) => {
    const id = normaliseRequiredString(event?.id, 'auditEvent.id', { identityId: dto.id, event })
    const eventType = normaliseRequiredString(event?.eventType, 'auditEvent.eventType', { identityId: dto.id, event })
    const summary = normaliseRequiredString(event?.summary, 'auditEvent.summary', { identityId: dto.id, event })
    const happenedAt = normaliseTimestamp(event?.happenedAt)

    if (!id || !eventType || !summary || !happenedAt) {
      if (!happenedAt) {
        logAccessRegistryInvariant('Missing or invalid auditEvent.happenedAt while mapping admin access DTO.', { identityId: dto.id, event })
      }
      return []
    }

    return [{
      id,
      eventType,
      summary,
      actorName: normaliseOptionalString(event.actorName),
      happenedAt,
    }]
  })
}

function resolveInternalRole(dto: AdminAccessIdentityDTO): InternalAdminRole | null {
  const internalRoles = getSafeRoles(dto)
    .map((role) => role.key)
    .filter((roleKey): roleKey is InternalAdminRole => INTERNAL_ROLE_SET.has(roleKey))

  return INTERNAL_ROLE_PRIORITY.find((role) => internalRoles.includes(role)) ?? null
}

function resolvePrimaryOrganisationId(dto: AdminAccessIdentityDTO): string | null {
  const memberships = getSafeMemberships(dto)
  const roles = getSafeRoles(dto)

  return memberships[0]?.organisationId ?? roles.find((role) => role.organisationId)?.organisationId ?? null
}

function getLatestTimestamp(...values: Array<string | null | undefined>): string {
  const timestamps = values
    .map((value) => normaliseTimestamp(value))
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value))

  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : new Date(0).toISOString()
}

function mapAuditAction(eventType: string): AuditAction {
  if (eventType.includes('sign_in')) {
    return AuditAction.SignIn
  }

  if (eventType.includes('invite')) {
    return AuditAction.Created
  }

  if (eventType.includes('suspend') || eventType.includes('status')) {
    return AuditAction.StatusChanged
  }

  if (eventType.includes('role_granted') || eventType.includes('role_assigned')) {
    return AuditAction.RoleGranted
  }

  if (eventType.includes('role_revoked')) {
    return AuditAction.RoleRevoked
  }

  return AuditAction.Updated
}

function mapAuditEvent(dto: AdminAccessIdentityDTO, event: AdminAccessAuditEventDTO): AuditLogEvent {
  return {
    id: event.id,
    action: mapAuditAction(event.eventType),
    actor: {
      userId: `${dto.id}:actor:${event.id}`,
      displayName: event.actorName ?? 'System',
      email: '',
      kind: UserKind.InternalAdmin,
    },
    entity: {
      entityType: AuditEntityType.AdminAccess,
      entityId: dto.id,
      label: dto.fullName,
    },
    occurredAt: normaliseTimestamp(event.happenedAt) ?? new Date(0).toISOString(),
    summary: event.summary,
    details: {
      eventType: event.eventType,
    },
  }
}

export function mapAccessIdentityDtoToAdminUser(dto: AdminAccessIdentityDTO): User {
  const id = normaliseRequiredString(dto.id, 'identity.id', { dto }) ?? 'unknown-identity'
  const fullName = normaliseRequiredString(dto.fullName, 'identity.fullName', { identityId: id, dto }) ?? 'Unknown identity'
  const email = normaliseRequiredString(dto.email, 'identity.email', { identityId: id, dto }) ?? `unknown-${id}@invalid.local`
  const createdAt = normaliseTimestamp(dto.createdAt)

  if (!createdAt) {
    logAccessRegistryInvariant('Missing or invalid identity.createdAt while mapping admin access DTO.', { identityId: id, dto })
  }

  const { firstName, lastName } = parseName(fullName)
  const memberships = getSafeMemberships(dto)
  const auditEvents = getSafeAuditEvents(dto)
  const roles = getSafeRoles(dto)
  const primaryOrganisationId = resolvePrimaryOrganisationId({ ...dto, memberships, roles, auditEvents })
  const latestAuditEvent = auditEvents[0] ?? null

  return {
    id,
    externalAuthId: normaliseOptionalString(dto.authBinding),
    email,
    status: mapUserStatus(dto.status),
    kind: mapIdentityTypeToUserKind(dto.identityType),
    profile: {
      firstName,
      lastName,
      fullName,
      title: roles[0]?.label ?? null,
      avatarUrl: null,
    },
    internalAdminRole: dto.identityType === 'internal' ? resolveInternalRole({ ...dto, roles, memberships, auditEvents }) : null,
    primaryOrganisationId,
    recentActivity: {
      lastActiveAt: normaliseTimestamp(dto.lastActivityAt) ?? memberships[0]?.lastActivityAt ?? null,
      lastAuditEventId: latestAuditEvent?.id ?? null,
      lastAssessmentVersionId: null,
    },
    createdAt: createdAt ?? new Date(0).toISOString(),
    updatedAt: getLatestTimestamp(
      createdAt,
      dto.lastActivityAt,
      latestAuditEvent?.happenedAt,
      ...memberships.flatMap((membership) => [membership.lastActivityAt, membership.invitedAt, membership.joinedAt]),
    ),
  }
}

export function mapAccessRegistryDtosToAdminUsers(dtos: AdminAccessIdentityDTO[] | null | undefined): User[] {
  return ensureArray(dtos).map(mapAccessIdentityDtoToAdminUser)
}

export function mapAccessIdentityDtoToOrganisationMemberships(dto: AdminAccessIdentityDTO): OrganisationMembership[] {
  return getSafeMemberships(dto).map((membership) => {
    const role = ORGANISATION_ROLE_SET.has(membership.membershipRole)
      ? membership.membershipRole as OrganisationRole
      : OrganisationRole.Member

    if (!ORGANISATION_ROLE_SET.has(membership.membershipRole)) {
      logAccessRegistryInvariant('Unexpected membership role encountered during admin access mapping.', {
        identityId: dto.id,
        membershipRole: membership.membershipRole,
        organisationId: membership.organisationId,
      })
    }

    return {
      id: `${dto.id}:${membership.organisationId}`,
      organisationId: membership.organisationId,
      userId: dto.id,
      role,
      isBillingContact: membership.membershipRole === OrganisationRole.Owner,
      isAssessmentContact: [OrganisationRole.Owner, OrganisationRole.Admin, OrganisationRole.Manager].includes(role),
      invitedAt: membership.invitedAt ?? null,
      joinedAt: membership.joinedAt ?? null,
      lastActiveAt: membership.lastActivityAt ?? null,
      createdAt: membership.invitedAt ?? membership.joinedAt ?? normaliseTimestamp(dto.createdAt) ?? new Date(0).toISOString(),
      updatedAt: getLatestTimestamp(membership.lastActivityAt, membership.joinedAt, membership.invitedAt, dto.createdAt),
    }
  })
}

export function mapAccessIdentityDtoToAuditEvents(dto: AdminAccessIdentityDTO): AuditLogEvent[] {
  return getSafeAuditEvents(dto).map((event) => mapAuditEvent(dto, event))
}

export function mapAccessRegistryDtosToDomainData(dtos: AdminAccessIdentityDTO[] | null | undefined): AdminAccessRegistryDomainData {
  const safeDtos = ensureArray(dtos)
  const organisationsById = new Map<string, Organisation>()
  const memberships = safeDtos.flatMap((dto) => mapAccessIdentityDtoToOrganisationMemberships(dto))
  const auditEvents = safeDtos.flatMap(mapAccessIdentityDtoToAuditEvents)

  for (const dto of safeDtos) {
    for (const membership of getSafeMemberships(dto)) {
      if (!organisationsById.has(membership.organisationId)) {
        organisationsById.set(membership.organisationId, {
          id: membership.organisationId,
          slug: membership.organisationSlug ?? membership.organisationName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
          name: membership.organisationName,
          status: mapOrganisationStatus(membership.organisationStatus ?? membership.membershipStatus),
          plan: OrganisationPlan.Growth,
          sector: 'Organisation',
          region: membership.organisationCountry ?? 'Unknown region',
          primaryContactUserId: null,
          seatSummary: { purchased: 0, assigned: 0, invited: 0, available: 0 },
          enabledProducts: [],
          enabledAssessmentIds: [],
          workspaceProvisionedAt: null,
          contractRenewalDate: null,
          lastActivityAt: membership.lastActivityAt ?? null,
          createdAt: membership.organisationCreatedAt ?? membership.invitedAt ?? membership.joinedAt ?? new Date(0).toISOString(),
          updatedAt: getLatestTimestamp(membership.lastActivityAt, membership.joinedAt, membership.invitedAt, membership.organisationCreatedAt),
        })
      }
    }
  }

  return {
    users: mapAccessRegistryDtosToAdminUsers(safeDtos),
    organisations: [...organisationsById.values()],
    memberships,
    auditEvents,
  }
}
