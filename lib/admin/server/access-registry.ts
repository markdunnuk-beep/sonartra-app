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
  roles: AdminAccessIdentityRoleDTO[]
  memberships: AdminAccessMembershipDTO[]
  auditEvents: AdminAccessAuditEventDTO[]
}

interface IdentityRow {
  id: string
  email: string
  full_name: string
  identity_type: 'internal' | 'organisation'
  auth_provider: string | null
  auth_subject: string | null
  status: 'active' | 'inactive' | 'suspended' | 'invited'
  last_activity_at: string | null
  created_at: string
}

interface RoleRow {
  identity_id: string
  key: string
  label: string
  organisation_id: string | null
}

interface MembershipRow {
  identity_id: string
  organisation_id: string
  organisation_name: string
  organisation_slug: string
  organisation_country: string | null
  organisation_status: string
  organisation_created_at: string
  membership_role: string
  membership_status: string
  joined_at: string | null
  invited_at: string | null
  last_activity_at: string | null
}

interface AuditRow {
  id: string
  identity_id: string
  event_type: string
  event_summary: string
  actor_name: string | null
  happened_at: string
}

function buildAuthBinding(authProvider: string | null, authSubject: string | null): string | null {
  if (!authProvider && !authSubject) {
    return null
  }

  if (authProvider && authSubject) {
    return `${authProvider}:${authSubject}`
  }

  return authProvider ?? authSubject
}

function assembleIdentityDtos(identities: IdentityRow[], roles: RoleRow[], memberships: MembershipRow[], auditRows: AuditRow[]): AdminAccessIdentityDTO[] {
  const rolesByIdentity = new Map<string, AdminAccessIdentityRoleDTO[]>()
  const membershipsByIdentity = new Map<string, AdminAccessMembershipDTO[]>()
  const auditByIdentity = new Map<string, AdminAccessAuditEventDTO[]>()

  for (const role of roles) {
    const current = rolesByIdentity.get(role.identity_id) ?? []
    current.push({
      key: role.key,
      label: role.label,
      organisationId: role.organisation_id,
    })
    rolesByIdentity.set(role.identity_id, current)
  }

  for (const membership of memberships) {
    const current = membershipsByIdentity.get(membership.identity_id) ?? []
    current.push({
      organisationId: membership.organisation_id,
      organisationName: membership.organisation_name,
      organisationSlug: membership.organisation_slug,
      organisationCountry: membership.organisation_country,
      organisationStatus: membership.organisation_status,
      organisationCreatedAt: membership.organisation_created_at,
      membershipRole: membership.membership_role,
      membershipStatus: membership.membership_status,
      joinedAt: membership.joined_at,
      invitedAt: membership.invited_at,
      lastActivityAt: membership.last_activity_at,
    })
    membershipsByIdentity.set(membership.identity_id, current)
  }

  for (const auditRow of auditRows) {
    const current = auditByIdentity.get(auditRow.identity_id) ?? []
    current.push({
      id: auditRow.id,
      eventType: auditRow.event_type,
      summary: auditRow.event_summary,
      actorName: auditRow.actor_name,
      happenedAt: auditRow.happened_at,
    })
    auditByIdentity.set(auditRow.identity_id, current)
  }

  return identities.map((identity) => ({
    id: identity.id,
    fullName: identity.full_name,
    email: identity.email,
    identityType: identity.identity_type,
    status: identity.status,
    authBinding: buildAuthBinding(identity.auth_provider, identity.auth_subject),
    lastActivityAt: identity.last_activity_at,
    createdAt: identity.created_at,
    roles: (rolesByIdentity.get(identity.id) ?? []).sort((left, right) => left.label.localeCompare(right.label)),
    memberships: (membershipsByIdentity.get(identity.id) ?? []).sort((left, right) => left.organisationName.localeCompare(right.organisationName)),
    auditEvents: (auditByIdentity.get(identity.id) ?? []).sort((left, right) => Date.parse(right.happenedAt) - Date.parse(left.happenedAt)),
  }))
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

  return result.rows
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

  return result.rows
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

  return result.rows
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

  return result.rows
}

export async function getAdminAccessRegistryData(): Promise<AdminAccessIdentityDTO[]> {
  const [identities, roles, memberships, auditRows] = await Promise.all([
    getIdentityRows(),
    getRoleRows(),
    getMembershipRows(),
    getAuditRows(),
  ])

  return assembleIdentityDtos(identities, roles, memberships, auditRows)
}

export async function getAdminIdentityById(id: string): Promise<AdminAccessIdentityDTO | null> {
  const [identities, roles, memberships, auditRows] = await Promise.all([
    getIdentityRows([id]),
    getRoleRows([id]),
    getMembershipRows([id]),
    getAuditRows([id]),
  ])

  return assembleIdentityDtos(identities, roles, memberships, auditRows)[0] ?? null
}

export async function getAdminIdentityAuditHistory(id: string): Promise<AdminAccessAuditEventDTO[]> {
  const auditRows = await getAuditRows([id])

  return auditRows.map((auditRow) => ({
    id: auditRow.id,
    eventType: auditRow.event_type,
    summary: auditRow.event_summary,
    actorName: auditRow.actor_name,
    happenedAt: auditRow.happened_at,
  }))
}
