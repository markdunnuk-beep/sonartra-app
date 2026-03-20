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
import type { AdminAccessAuditEventDTO, AdminAccessIdentityDTO } from './access-registry'

const INTERNAL_ROLE_PRIORITY: InternalAdminRole[] = [
  InternalAdminRole.SuperAdmin,
  InternalAdminRole.PlatformAdmin,
  InternalAdminRole.AssessmentAdmin,
  InternalAdminRole.CustomerSuccessAdmin,
  InternalAdminRole.SupportAdmin,
]

const INTERNAL_ROLE_SET = new Set<string>(INTERNAL_ROLE_PRIORITY)
const ORGANISATION_ROLE_SET = new Set<string>(Object.values(OrganisationRole))

function parseName(fullName: string): { firstName: string; lastName: string } {
  const [firstName = fullName, ...rest] = fullName.trim().split(/\s+/)

  return {
    firstName,
    lastName: rest.join(' '),
  }
}

function mapUserStatus(status: AdminAccessIdentityDTO['status']): UserStatus {
  switch (status) {
    case 'active':
      return UserStatus.Active
    case 'inactive':
      return UserStatus.Deactivated
    case 'suspended':
      return UserStatus.Suspended
    case 'invited':
      return UserStatus.Invited
  }
}

function mapOrganisationStatus(status: string): OrganisationStatus {
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
    default:
      return OrganisationStatus.Active
  }
}

function resolveInternalRole(dto: AdminAccessIdentityDTO): InternalAdminRole | null {
  const internalRoles = dto.roles
    .map((role) => role.key)
    .filter((roleKey): roleKey is InternalAdminRole => INTERNAL_ROLE_SET.has(roleKey))

  return INTERNAL_ROLE_PRIORITY.find((role) => internalRoles.includes(role)) ?? null
}

function resolvePrimaryOrganisationId(dto: AdminAccessIdentityDTO): string | null {
  return dto.memberships[0]?.organisationId ?? dto.roles.find((role) => role.organisationId)?.organisationId ?? null
}

function getLatestTimestamp(...values: Array<string | null | undefined>): string {
  const timestamps = values
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
    occurredAt: event.happenedAt,
    summary: event.summary,
    details: {
      eventType: event.eventType,
    },
  }
}

export function mapAccessIdentityDtoToAdminUser(dto: AdminAccessIdentityDTO): User {
  const { firstName, lastName } = parseName(dto.fullName)
  const primaryOrganisationId = resolvePrimaryOrganisationId(dto)
  const latestAuditEvent = dto.auditEvents[0] ?? null

  return {
    id: dto.id,
    externalAuthId: dto.authBinding ?? null,
    email: dto.email,
    status: mapUserStatus(dto.status),
    kind: dto.identityType === 'internal' ? UserKind.InternalAdmin : UserKind.OrganisationUser,
    profile: {
      firstName,
      lastName,
      fullName: dto.fullName,
      title: dto.roles[0]?.label ?? null,
      avatarUrl: null,
    },
    internalAdminRole: dto.identityType === 'internal' ? resolveInternalRole(dto) : null,
    primaryOrganisationId,
    recentActivity: {
      lastActiveAt: dto.lastActivityAt ?? dto.memberships[0]?.lastActivityAt ?? null,
      lastAuditEventId: latestAuditEvent?.id ?? null,
      lastAssessmentVersionId: null,
    },
    createdAt: dto.createdAt,
    updatedAt: getLatestTimestamp(
      dto.createdAt,
      dto.lastActivityAt,
      latestAuditEvent?.happenedAt,
      ...dto.memberships.flatMap((membership) => [membership.lastActivityAt, membership.invitedAt, membership.joinedAt]),
    ),
  }
}

export function mapAccessRegistryDtosToAdminUsers(dtos: AdminAccessIdentityDTO[]): User[] {
  return dtos.map(mapAccessIdentityDtoToAdminUser)
}

export function mapAccessIdentityDtoToOrganisationMemberships(dto: AdminAccessIdentityDTO): OrganisationMembership[] {
  return dto.memberships.map((membership) => ({
    id: `${dto.id}:${membership.organisationId}`,
    organisationId: membership.organisationId,
    userId: dto.id,
    role: ORGANISATION_ROLE_SET.has(membership.membershipRole) ? membership.membershipRole as OrganisationRole : OrganisationRole.Member,
    isBillingContact: membership.membershipRole === OrganisationRole.Owner,
    isAssessmentContact: [OrganisationRole.Owner, OrganisationRole.Admin, OrganisationRole.Manager].includes(
      (ORGANISATION_ROLE_SET.has(membership.membershipRole) ? membership.membershipRole : OrganisationRole.Member) as OrganisationRole,
    ),
    invitedAt: membership.invitedAt ?? null,
    joinedAt: membership.joinedAt ?? null,
    lastActiveAt: membership.lastActivityAt ?? null,
    createdAt: membership.invitedAt ?? membership.joinedAt ?? dto.createdAt,
    updatedAt: getLatestTimestamp(membership.lastActivityAt, membership.joinedAt, membership.invitedAt, dto.createdAt),
  }))
}

export function mapAccessIdentityDtoToAuditEvents(dto: AdminAccessIdentityDTO): AuditLogEvent[] {
  return dto.auditEvents.map((event) => mapAuditEvent(dto, event))
}

export function mapAccessRegistryDtosToDomainData(dtos: AdminAccessIdentityDTO[]): AdminAccessRegistryDomainData {
  const organisationsById = new Map<string, Organisation>()
  const memberships = dtos.flatMap((dto) => mapAccessIdentityDtoToOrganisationMemberships(dto))
  const auditEvents = dtos.flatMap(mapAccessIdentityDtoToAuditEvents)

  for (const dto of dtos) {
    for (const membership of dto.memberships) {
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
          updatedAt: getLatestTimestamp(membership.lastActivityAt, membership.joinedAt, membership.invitedAt),
        })
      }
    }
  }

  return {
    users: mapAccessRegistryDtosToAdminUsers(dtos),
    organisations: [...organisationsById.values()],
    memberships,
    auditEvents,
  }
}
