export interface LegacyUserRecord {
  id: string
  email: string | null
  firstName: string | null
  lastName: string | null
  accountType: string | null
  externalAuthId: string | null
  createdAt: string | Date | null
  updatedAt: string | Date | null
  lastAssessmentActivityAt: string | Date | null
}

export interface LegacyOrganisationMembershipRecord {
  id: string
  userId: string
  organisationId: string
  role: string | null
  memberStatus: string | null
  joinedAt: string | Date | null
  createdAt: string | Date | null
  updatedAt: string | Date | null
  lastActivityAt: string | Date | null
}

export interface AdminIdentityUpsertRecord {
  id: string
  email: string
  fullName: string
  identityType: 'internal' | 'organisation'
  authProvider: string | null
  authSubject: string | null
  status: 'active' | 'inactive' | 'suspended' | 'invited'
  lastActivityAt: string | null
  createdAt: string
}

export interface OrganisationMembershipUpsertRecord {
  identityId: string
  organisationId: string
  membershipRole: string
  membershipStatus: 'active' | 'inactive' | 'suspended' | 'invited'
  joinedAt: string | null
  invitedAt: string | null
  lastActivityAt: string | null
}

export interface AdminIdentityRoleUpsertRecord {
  identityId: string
  roleKey: string
  organisationId: string | null
  assignedAt: string
}

export interface ExistingAdminIdentityRecord extends AdminIdentityUpsertRecord {}

export interface ExistingOrganisationMembershipRecord extends OrganisationMembershipUpsertRecord {}

export interface ExistingAdminIdentityRoleRecord {
  identityId: string
  roleKey: string
  organisationId: string | null
  assignedAt: string
}

export interface BootstrapMappingConfig {
  internalAdminEmails: string[]
}

export interface BootstrapAmbiguityLog {
  userId: string
  email: string | null
  reason: string
}

export interface BootstrapCounters {
  sourceUsers: number
  sourceMemberships: number
  identitiesPlanned: number
  identitiesCreated: number
  identitiesUpdated: number
  identitiesUnchanged: number
  membershipsPlanned: number
  membershipsCreated: number
  membershipsUpdated: number
  membershipsUnchanged: number
  roleAssignmentsPlanned: number
  roleAssignmentsCreated: number
  roleAssignmentsUpdated: number
  roleAssignmentsUnchanged: number
  skippedMissingEmailCount: number
  skippedMissingIdentityCount: number
  skippedUnknownMembershipRoleCount: number
  ambiguousIdentityTypeCount: number
  auditEventsPlanned: number
}

export interface AdminAccessRegistryBootstrapPlan {
  mappingPlan: string[]
  identities: AdminIdentityUpsertRecord[]
  memberships: OrganisationMembershipUpsertRecord[]
  roleAssignments: AdminIdentityRoleUpsertRecord[]
  auditEvents: []
  ambiguities: BootstrapAmbiguityLog[]
  counters: BootstrapCounters
}

export interface BootstrapExistingState {
  identitiesById?: Map<string, ExistingAdminIdentityRecord>
  membershipsByCompositeKey?: Map<string, ExistingOrganisationMembershipRecord>
  roleAssignmentsByCompositeKey?: Map<string, ExistingAdminIdentityRoleRecord>
}

const DIRECT_ORGANISATION_ROLE_KEYS = new Set(['owner', 'admin', 'manager', 'analyst'])
const KNOWN_MEMBER_ROLE_KEYS = new Set([...DIRECT_ORGANISATION_ROLE_KEYS, 'member'])
const INTERNAL_ACCOUNT_TYPE_KEYS = new Set(['internal', 'admin', 'staff', 'operator'])

export function normaliseEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim().toLowerCase()
  return trimmed ? trimmed : null
}

export function normaliseTimestamp(value: string | Date | null | undefined): string | null {
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

export function parseAdminEmailAllowlist(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((email) => normaliseEmail(email))
    .filter((email): email is string => Boolean(email))
}

function buildFullName(user: LegacyUserRecord, email: string): string {
  const firstName = user.firstName?.trim() ?? ''
  const lastName = user.lastName?.trim() ?? ''
  const joinedName = `${firstName} ${lastName}`.trim()

  if (joinedName) {
    return joinedName
  }

  return email.split('@')[0] ?? email
}

function getLatestTimestamp(...values: Array<string | Date | null | undefined>): string | null {
  const timestamps = values
    .map((value) => normaliseTimestamp(value))
    .filter((value): value is string => Boolean(value))
    .map((value) => Date.parse(value))
    .filter((value) => Number.isFinite(value))

  return timestamps.length ? new Date(Math.max(...timestamps)).toISOString() : null
}

function normaliseMembershipRole(role: string | null | undefined): string | null {
  const normalisedRole = role?.trim().toLowerCase()
  return normalisedRole ? normalisedRole : null
}

export function mapMembershipStatus(memberStatus: string | null | undefined): OrganisationMembershipUpsertRecord['membershipStatus'] {
  switch (memberStatus?.trim().toLowerCase()) {
    case 'active':
      return 'active'
    case 'invited':
    case 'pending':
      return 'invited'
    case 'suspended':
      return 'suspended'
    case 'inactive':
    case 'disabled':
    case 'removed':
    case 'revoked':
    case 'archived':
      return 'inactive'
    case undefined:
    case null:
    case '':
      return 'active'
    default:
      return 'inactive'
  }
}

function deriveIdentityStatus(memberships: LegacyOrganisationMembershipRecord[]): AdminIdentityUpsertRecord['status'] {
  const statuses = memberships.map((membership) => mapMembershipStatus(membership.memberStatus))

  if (statuses.includes('active')) {
    return 'active'
  }

  if (statuses.includes('invited')) {
    return 'invited'
  }

  if (statuses.includes('suspended')) {
    return 'suspended'
  }

  if (statuses.length > 0) {
    return 'inactive'
  }

  return 'active'
}

export function classifyLegacyIdentity(
  user: LegacyUserRecord,
  memberships: LegacyOrganisationMembershipRecord[],
  config: BootstrapMappingConfig,
): { identityType: AdminIdentityUpsertRecord['identityType']; ambiguousReason: string | null } {
  const email = normaliseEmail(user.email)
  const allowlist = new Set(config.internalAdminEmails.map((entry) => normaliseEmail(entry)).filter((entry): entry is string => Boolean(entry)))
  const accountType = user.accountType?.trim().toLowerCase() ?? null

  if (email && allowlist.has(email)) {
    return { identityType: 'internal', ambiguousReason: null }
  }

  if (accountType && INTERNAL_ACCOUNT_TYPE_KEYS.has(accountType)) {
    return { identityType: 'internal', ambiguousReason: null }
  }

  if (memberships.length > 0) {
    return { identityType: 'organisation', ambiguousReason: null }
  }

  return {
    identityType: 'organisation',
    ambiguousReason: 'No organisation membership or trusted internal signal found; defaulted to organisation.',
  }
}

export function mapLegacyUserToAdminIdentity(
  user: LegacyUserRecord,
  memberships: LegacyOrganisationMembershipRecord[],
  config: BootstrapMappingConfig,
): { identity: AdminIdentityUpsertRecord | null; ambiguity: BootstrapAmbiguityLog | null; skippedMissingEmail: boolean } {
  const email = normaliseEmail(user.email)

  if (!email) {
    return {
      identity: null,
      ambiguity: null,
      skippedMissingEmail: true,
    }
  }

  const classification = classifyLegacyIdentity(user, memberships, config)

  return {
    identity: {
      // Production-safe deterministic bridge: reuse public.users.id so reruns remain idempotent without a separate source-id mapping table.
      id: user.id,
      email,
      fullName: buildFullName(user, email),
      identityType: classification.identityType,
      authProvider: user.externalAuthId ? 'clerk' : null,
      authSubject: user.externalAuthId?.trim() || null,
      status: deriveIdentityStatus(memberships),
      lastActivityAt: getLatestTimestamp(user.lastAssessmentActivityAt, user.updatedAt),
      createdAt: normaliseTimestamp(user.createdAt) ?? new Date(0).toISOString(),
    },
    ambiguity: classification.ambiguousReason
      ? {
        userId: user.id,
        email,
        reason: classification.ambiguousReason,
      }
      : null,
    skippedMissingEmail: false,
  }
}

export function mapLegacyMembershipToOrganisationMembership(
  identityId: string,
  membership: LegacyOrganisationMembershipRecord,
): { membership: OrganisationMembershipUpsertRecord | null; skippedUnknownRole: boolean } {
  const membershipRole = normaliseMembershipRole(membership.role)

  if (!membershipRole || !KNOWN_MEMBER_ROLE_KEYS.has(membershipRole)) {
    return {
      membership: null,
      skippedUnknownRole: true,
    }
  }

  const membershipStatus = mapMembershipStatus(membership.memberStatus)
  const invitedAt = membershipStatus === 'invited'
    ? getLatestTimestamp(membership.createdAt, membership.updatedAt)
    : null

  return {
    membership: {
      identityId,
      organisationId: membership.organisationId,
      membershipRole,
      membershipStatus,
      joinedAt: normaliseTimestamp(membership.joinedAt),
      invitedAt,
      lastActivityAt: getLatestTimestamp(membership.lastActivityAt, membership.updatedAt),
    },
    skippedUnknownRole: false,
  }
}

export function mapLegacyMembershipToRoleAssignment(
  identityId: string,
  membership: LegacyOrganisationMembershipRecord,
): AdminIdentityRoleUpsertRecord | null {
  const membershipRole = normaliseMembershipRole(membership.role)

  if (!membershipRole || !DIRECT_ORGANISATION_ROLE_KEYS.has(membershipRole)) {
    return null
  }

  return {
    identityId,
    roleKey: membershipRole,
    organisationId: membership.organisationId,
    assignedAt: getLatestTimestamp(membership.joinedAt, membership.createdAt, membership.updatedAt) ?? new Date(0).toISOString(),
  }
}

function membershipCompositeKey(record: Pick<OrganisationMembershipUpsertRecord, 'identityId' | 'organisationId'>): string {
  return `${record.identityId}::${record.organisationId}`
}

function roleCompositeKey(record: Pick<AdminIdentityRoleUpsertRecord, 'identityId' | 'roleKey' | 'organisationId'>): string {
  return `${record.identityId}::${record.roleKey}::${record.organisationId ?? '__internal__'}`
}

function recordsEqual<T extends object>(left: T | undefined, right: T): boolean {
  if (!left) {
    return false
  }

  const keys = Object.keys(right) as Array<keyof T>
  return keys.every((key) => left[key] === right[key])
}

export function buildAdminAccessRegistryBootstrapPlan(input: {
  users: LegacyUserRecord[]
  memberships: LegacyOrganisationMembershipRecord[]
  config: BootstrapMappingConfig
  existing?: BootstrapExistingState
}): AdminAccessRegistryBootstrapPlan {
  const membershipsByUserId = new Map<string, LegacyOrganisationMembershipRecord[]>()

  for (const membership of input.memberships) {
    const current = membershipsByUserId.get(membership.userId) ?? []
    current.push(membership)
    membershipsByUserId.set(membership.userId, current)
  }

  const mappingPlan = [
    'Source -> target mapping plan:',
    '- public.users -> admin_identities using the legacy user UUID as admin_identities.id for deterministic reruns and source traceability.',
    '- public.organisation_members -> organisation_memberships using (identity_id, organisation_id) as the idempotent upsert key.',
    '- public.organisation_members.role values owner/admin/manager/analyst -> admin_identity_roles organisation-scoped role assignments.',
    '- public.users.external_auth_id -> admin_identities.auth_subject with auth_provider=clerk when present.',
    '- internal identity_type is assigned only from trusted production signals: SONARTRA_ADMIN_EMAILS allowlist or explicit internal/staff/admin/operator account_type values.',
    '- access_audit_events remains empty in phase 1 because no trusted legacy audit source table exists in the current schema.',
  ]

  const ambiguities: BootstrapAmbiguityLog[] = []
  const identities: AdminIdentityUpsertRecord[] = []
  const memberships: OrganisationMembershipUpsertRecord[] = []
  const roleAssignments: AdminIdentityRoleUpsertRecord[] = []

  let skippedMissingEmailCount = 0
  let skippedUnknownMembershipRoleCount = 0

  for (const user of input.users) {
    const userMemberships = membershipsByUserId.get(user.id) ?? []
    const mappedIdentity = mapLegacyUserToAdminIdentity(user, userMemberships, input.config)

    if (mappedIdentity.skippedMissingEmail) {
      skippedMissingEmailCount += 1
      continue
    }

    if (!mappedIdentity.identity) {
      continue
    }

    if (mappedIdentity.ambiguity) {
      ambiguities.push(mappedIdentity.ambiguity)
    }

    identities.push(mappedIdentity.identity)

    for (const membership of userMemberships) {
      const mappedMembership = mapLegacyMembershipToOrganisationMembership(mappedIdentity.identity.id, membership)

      if (!mappedMembership.membership) {
        skippedUnknownMembershipRoleCount += 1
        continue
      }

      memberships.push(mappedMembership.membership)

      const roleAssignment = mapLegacyMembershipToRoleAssignment(mappedIdentity.identity.id, membership)
      if (roleAssignment) {
        roleAssignments.push(roleAssignment)
      }
    }
  }

  const existingIdentitiesById = input.existing?.identitiesById ?? new Map<string, ExistingAdminIdentityRecord>()
  const existingMembershipsByCompositeKey = input.existing?.membershipsByCompositeKey ?? new Map<string, ExistingOrganisationMembershipRecord>()
  const existingRoleAssignmentsByCompositeKey = input.existing?.roleAssignmentsByCompositeKey ?? new Map<string, ExistingAdminIdentityRoleRecord>()

  const identitiesCreated = identities.filter((identity) => !existingIdentitiesById.has(identity.id)).length
  const identitiesUpdated = identities.filter((identity) => {
    const existing = existingIdentitiesById.get(identity.id)
    return Boolean(existing) && !recordsEqual(existing, identity)
  }).length
  const identitiesUnchanged = identities.length - identitiesCreated - identitiesUpdated

  const membershipsCreated = memberships.filter((membership) => !existingMembershipsByCompositeKey.has(membershipCompositeKey(membership))).length
  const membershipsUpdated = memberships.filter((membership) => {
    const existing = existingMembershipsByCompositeKey.get(membershipCompositeKey(membership))
    return Boolean(existing) && !recordsEqual(existing, membership)
  }).length
  const membershipsUnchanged = memberships.length - membershipsCreated - membershipsUpdated

  const roleAssignmentsCreated = roleAssignments.filter((roleAssignment) => !existingRoleAssignmentsByCompositeKey.has(roleCompositeKey(roleAssignment))).length
  const roleAssignmentsUpdated = roleAssignments.filter((roleAssignment) => {
    const existing = existingRoleAssignmentsByCompositeKey.get(roleCompositeKey(roleAssignment))
    return Boolean(existing) && !recordsEqual(existing, roleAssignment)
  }).length
  const roleAssignmentsUnchanged = roleAssignments.length - roleAssignmentsCreated - roleAssignmentsUpdated

  return {
    mappingPlan,
    identities,
    memberships,
    roleAssignments,
    auditEvents: [],
    ambiguities,
    counters: {
      sourceUsers: input.users.length,
      sourceMemberships: input.memberships.length,
      identitiesPlanned: identities.length,
      identitiesCreated,
      identitiesUpdated,
      identitiesUnchanged,
      membershipsPlanned: memberships.length,
      membershipsCreated,
      membershipsUpdated,
      membershipsUnchanged,
      roleAssignmentsPlanned: roleAssignments.length,
      roleAssignmentsCreated,
      roleAssignmentsUpdated,
      roleAssignmentsUnchanged,
      skippedMissingEmailCount,
      skippedMissingIdentityCount: 0,
      skippedUnknownMembershipRoleCount,
      ambiguousIdentityTypeCount: ambiguities.length,
      auditEventsPlanned: 0,
    },
  }
}

export function buildExistingIdentityMap(records: ExistingAdminIdentityRecord[]): Map<string, ExistingAdminIdentityRecord> {
  return new Map(records.map((record) => [record.id, record]))
}

export function buildExistingMembershipMap(records: ExistingOrganisationMembershipRecord[]): Map<string, ExistingOrganisationMembershipRecord> {
  return new Map(records.map((record) => [membershipCompositeKey(record), record]))
}

export function buildExistingRoleAssignmentMap(records: ExistingAdminIdentityRoleRecord[]): Map<string, ExistingAdminIdentityRoleRecord> {
  return new Map(records.map((record) => [roleCompositeKey(record), record]))
}
