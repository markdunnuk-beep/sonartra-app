import { queryDb } from '@/lib/db'

export interface AdminAccessIdentityRoleDTO {
  key: string
  label: string
  organisationId?: string | null
}

export interface AdminAccessMembershipDTO {
  organisationId: string
  organisationName: string
  organisationSlug?: string | null
  organisationCountry?: string | null
  organisationStatus?: string | null
  organisationCreatedAt?: string | null
  membershipRole: string
  membershipStatus: string
  joinedAt?: string | null
  invitedAt?: string | null
  lastActivityAt?: string | null
}

export interface AdminAccessAuditEventDTO {
  id: string
  eventType: string
  summary: string
  actorName?: string | null
  happenedAt: string
}

export interface AdminAccessIdentityDTO {
  id: string
  fullName: string
  email: string
  identityType: 'internal' | 'organisation'
  status: 'active' | 'inactive' | 'suspended' | 'invited'
  authBinding?: string | null
  lastActivityAt?: string | null
  createdAt: string
  roles?: AdminAccessIdentityRoleDTO[]
  memberships?: AdminAccessMembershipDTO[]
  auditEvents?: AdminAccessAuditEventDTO[]
}

interface IdentityRow {
  id: string | null
  email: string | null
  full_name: string | null
  identity_type: string | null
  auth_provider: string | null
  auth_subject: string | null
  status: string | null
  last_activity_at: string | Date | null
  created_at: string | Date | null
}

interface RoleRow {
  identity_id: string | null
  key: string | null
  label: string | null
  organisation_id: string | null
}

interface MembershipRow {
  identity_id: string | null
  organisation_id: string | null
  organisation_name: string | null
  organisation_slug: string | null
  organisation_country: string | null
  organisation_status: string | null
  organisation_created_at: string | Date | null
  membership_role: string | null
  membership_status: string | null
  joined_at: string | Date | null
  invited_at: string | Date | null
  last_activity_at: string | Date | null
}

interface AuditRow {
  id: string | null
  identity_id: string | null
  event_type: string | null
  event_summary: string | null
  actor_name: string | null
  happened_at: string | Date | null
}

const VALID_IDENTITY_TYPES = new Set<AdminAccessIdentityDTO['identityType']>(['internal', 'organisation'])
const VALID_IDENTITY_STATUSES = new Set<AdminAccessIdentityDTO['status']>(['active', 'inactive', 'suspended', 'invited'])

type TimestampInput = string | Date | null | undefined

function logAccessRegistryInvariant(message: string, details?: Record<string, unknown>) {
  console.error(`[admin-access-registry] ${message}`, details ?? {})
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
    logAccessRegistryInvariant(`Missing required ${fieldName} while assembling admin access registry data.`, details)
    return null
  }

  return trimmed
}

function normaliseOptionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function buildAuthBinding(authProvider: string | null, authSubject: string | null): string | null {
  const provider = normaliseOptionalString(authProvider)
  const subject = normaliseOptionalString(authSubject)

  if (!provider && !subject) {
    return null
  }

  if (provider && subject) {
    return `${provider}:${subject}`
  }

  return provider ?? subject
}

function normaliseIdentityType(value: string | null, details: Record<string, unknown>): AdminAccessIdentityDTO['identityType'] | null {
  if (value && VALID_IDENTITY_TYPES.has(value as AdminAccessIdentityDTO['identityType'])) {
    return value as AdminAccessIdentityDTO['identityType']
  }

  logAccessRegistryInvariant('Unexpected admin identity_type encountered while assembling access registry DTO.', {
    ...details,
    identityType: value,
  })
  return null
}

function normaliseIdentityStatus(value: string | null, details: Record<string, unknown>): AdminAccessIdentityDTO['status'] | null {
  if (value && VALID_IDENTITY_STATUSES.has(value as AdminAccessIdentityDTO['status'])) {
    return value as AdminAccessIdentityDTO['status']
  }

  logAccessRegistryInvariant('Unexpected admin identity status encountered while assembling access registry DTO.', {
    ...details,
    status: value,
  })
  return null
}

function sortText(value: string | null | undefined): string {
  return value?.toLowerCase() ?? ''
}

function assembleIdentityDtos(identities: IdentityRow[], roles: RoleRow[], memberships: MembershipRow[], auditRows: AuditRow[]): AdminAccessIdentityDTO[] {
  const rolesByIdentity = new Map<string, AdminAccessIdentityRoleDTO[]>()
  const membershipsByIdentity = new Map<string, AdminAccessMembershipDTO[]>()
  const auditByIdentity = new Map<string, AdminAccessAuditEventDTO[]>()

  for (const role of roles ?? []) {
    const identityId = normaliseRequiredString(role.identity_id, 'role.identity_id', { role })
    const key = normaliseRequiredString(role.key, 'role.key', { role })
    const label = normaliseRequiredString(role.label, 'role.label', { role })

    if (!identityId || !key || !label) {
      continue
    }

    const current = rolesByIdentity.get(identityId) ?? []
    current.push({
      key,
      label,
      organisationId: normaliseOptionalString(role.organisation_id),
    })
    rolesByIdentity.set(identityId, current)
  }

  for (const membership of memberships ?? []) {
    const identityId = normaliseRequiredString(membership.identity_id, 'membership.identity_id', { membership })
    const organisationId = normaliseRequiredString(membership.organisation_id, 'membership.organisation_id', { membership })
    const organisationName = normaliseRequiredString(membership.organisation_name, 'membership.organisation.name', { membership })
    const membershipRole = normaliseRequiredString(membership.membership_role, 'membership.membership_role', { membership })
    const membershipStatus = normaliseRequiredString(membership.membership_status, 'membership.membership_status', { membership })

    if (!identityId || !organisationId || !organisationName || !membershipRole || !membershipStatus) {
      continue
    }

    const current = membershipsByIdentity.get(identityId) ?? []
    current.push({
      organisationId,
      organisationName,
      organisationSlug: normaliseOptionalString(membership.organisation_slug),
      organisationCountry: normaliseOptionalString(membership.organisation_country),
      organisationStatus: normaliseOptionalString(membership.organisation_status),
      organisationCreatedAt: normaliseTimestamp(membership.organisation_created_at),
      membershipRole,
      membershipStatus,
      joinedAt: normaliseTimestamp(membership.joined_at),
      invitedAt: normaliseTimestamp(membership.invited_at),
      lastActivityAt: normaliseTimestamp(membership.last_activity_at),
    })
    membershipsByIdentity.set(identityId, current)
  }

  for (const auditRow of auditRows ?? []) {
    const identityId = normaliseRequiredString(auditRow.identity_id, 'audit.identity_id', { auditRow })
    const auditId = normaliseRequiredString(auditRow.id, 'audit.id', { auditRow })
    const eventType = normaliseRequiredString(auditRow.event_type, 'audit.event_type', { auditRow })
    const summary = normaliseRequiredString(auditRow.event_summary, 'audit.event_summary', { auditRow })
    const happenedAt = normaliseTimestamp(auditRow.happened_at)

    if (!identityId || !auditId || !eventType || !summary || !happenedAt) {
      if (!happenedAt) {
        logAccessRegistryInvariant('Missing or invalid audit.happened_at while assembling access registry DTO.', { auditRow })
      }
      continue
    }

    const current = auditByIdentity.get(identityId) ?? []
    current.push({
      id: auditId,
      eventType,
      summary,
      actorName: normaliseOptionalString(auditRow.actor_name),
      happenedAt,
    })
    auditByIdentity.set(identityId, current)
  }

  return (identities ?? []).flatMap((identity) => {
    const id = normaliseRequiredString(identity.id, 'identity.id', { identity })
    const fullName = normaliseRequiredString(identity.full_name, 'identity.full_name', { identity })
    const email = normaliseRequiredString(identity.email, 'identity.email', { identity })
    const identityType = normaliseIdentityType(identity.identity_type, { identityId: identity.id, identity })
    const status = normaliseIdentityStatus(identity.status, { identityId: identity.id, identity })
    const createdAt = normaliseTimestamp(identity.created_at)

    if (!id || !fullName || !email || !identityType || !status || !createdAt) {
      if (!createdAt) {
        logAccessRegistryInvariant('Missing or invalid identity.created_at while assembling access registry DTO.', { identity })
      }
      return []
    }

    return [{
      id,
      fullName,
      email,
      identityType,
      status,
      authBinding: buildAuthBinding(identity.auth_provider, identity.auth_subject),
      lastActivityAt: normaliseTimestamp(identity.last_activity_at),
      createdAt,
      roles: [...(rolesByIdentity.get(id) ?? [])].sort((left, right) => sortText(left.label).localeCompare(sortText(right.label))),
      memberships: [...(membershipsByIdentity.get(id) ?? [])].sort((left, right) => sortText(left.organisationName).localeCompare(sortText(right.organisationName))),
      auditEvents: [...(auditByIdentity.get(id) ?? [])].sort((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt)),
    }]
  })
}

async function getIdentityRows(identityIds?: string[]): Promise<IdentityRow[]> {
  const hasFilter = Boolean(identityIds?.length)
  const result = await queryDb<IdentityRow>(
    `
      select
        id,
        email,
        full_name,
        identity_type,
        auth_provider,
        auth_subject,
        status,
        last_activity_at,
        created_at
      from admin_identities
      ${hasFilter ? 'where id = any($1::uuid[])' : ''}
      order by full_name asc
    `,
    hasFilter ? [identityIds] : undefined,
  )

  return result.rows ?? []
}

async function getRoleRows(identityIds?: string[]): Promise<RoleRow[]> {
  const hasFilter = Boolean(identityIds?.length)
  const result = await queryDb<RoleRow>(
    `
      select
        air.identity_id,
        ar.key,
        ar.label,
        air.organisation_id
      from admin_identity_roles air
      inner join admin_roles ar on ar.id = air.role_id
      ${hasFilter ? 'where air.identity_id = any($1::uuid[])' : ''}
      order by air.assigned_at desc
    `,
    hasFilter ? [identityIds] : undefined,
  )

  return result.rows ?? []
}

async function getMembershipRows(identityIds?: string[]): Promise<MembershipRow[]> {
  const hasFilter = Boolean(identityIds?.length)
  const result = await queryDb<MembershipRow>(
    `
      select
        om.identity_id,
        om.organisation_id,
        o.name as organisation_name,
        o.slug as organisation_slug,
        o.country as organisation_country,
        o.status as organisation_status,
        o.created_at as organisation_created_at,
        om.membership_role,
        om.membership_status,
        om.joined_at,
        om.invited_at,
        om.last_activity_at
      from organisation_memberships om
      inner join organisations o on o.id = om.organisation_id
      ${hasFilter ? 'where om.identity_id = any($1::uuid[])' : ''}
      order by o.name asc, om.invited_at desc nulls last, om.joined_at desc nulls last
    `,
    hasFilter ? [identityIds] : undefined,
  )

  return result.rows ?? []
}

async function getAuditRows(identityIds?: string[]): Promise<AuditRow[]> {
  const hasFilter = Boolean(identityIds?.length)
  const result = await queryDb<AuditRow>(
    `
      select
        aae.id,
        aae.identity_id,
        aae.event_type,
        aae.event_summary,
        coalesce(aae.actor_name, actor.full_name) as actor_name,
        aae.happened_at
      from access_audit_events aae
      left join admin_identities actor on actor.id = aae.actor_identity_id
      ${hasFilter ? 'where aae.identity_id = any($1::uuid[])' : ''}
      order by aae.happened_at desc
    `,
    hasFilter ? [identityIds] : undefined,
  )

  return result.rows ?? []
}

export async function getAdminAccessRegistryData(): Promise<AdminAccessIdentityDTO[]> {
  try {
    const [identities, roles, memberships, auditRows] = await Promise.all([
      getIdentityRows(),
      getRoleRows(),
      getMembershipRows(),
      getAuditRows(),
    ])

    return assembleIdentityDtos(identities ?? [], roles ?? [], memberships ?? [], auditRows ?? [])
  } catch (error) {
    console.error('[admin-access-registry] Failed to load admin access registry collection.', error)
    return []
  }
}

export async function getAdminIdentityById(id: string): Promise<AdminAccessIdentityDTO | null> {
  try {
    const [identities, roles, memberships, auditRows] = await Promise.all([
      getIdentityRows([id]),
      getRoleRows([id]),
      getMembershipRows([id]),
      getAuditRows([id]),
    ])

    return assembleIdentityDtos(identities ?? [], roles ?? [], memberships ?? [], auditRows ?? [])[0] ?? null
  } catch (error) {
    console.error('[admin-access-registry] Failed to load admin access registry identity.', { id, error })
    return null
  }
}

export async function getAdminIdentityAuditHistory(id: string): Promise<AdminAccessAuditEventDTO[]> {
  try {
    const auditRows = await getAuditRows([id])

    return (auditRows ?? []).flatMap((auditRow) => {
      const auditId = normaliseRequiredString(auditRow.id, 'audit.id', { auditRow, identityId: id })
      const eventType = normaliseRequiredString(auditRow.event_type, 'audit.event_type', { auditRow, identityId: id })
      const summary = normaliseRequiredString(auditRow.event_summary, 'audit.event_summary', { auditRow, identityId: id })
      const happenedAt = normaliseTimestamp(auditRow.happened_at)

      if (!auditId || !eventType || !summary || !happenedAt) {
        if (!happenedAt) {
          logAccessRegistryInvariant('Missing or invalid audit.happened_at while loading identity audit history.', { auditRow, identityId: id })
        }
        return []
      }

      return [{
        id: auditId,
        eventType,
        summary,
        actorName: normaliseOptionalString(auditRow.actor_name),
        happenedAt,
      }]
    })
  } catch (error) {
    console.error('[admin-access-registry] Failed to load admin identity audit history.', { id, error })
    return []
  }
}
