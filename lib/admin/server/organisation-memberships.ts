import { auth, currentUser } from '@clerk/nextjs/server'
import type { PoolClient } from 'pg'
import { resolveAdminAccess, type AdminAccessContext } from '@/lib/admin/access'
import {
  ADMIN_ORGANISATION_MEMBERSHIP_ROLES,
  type AdminOrganisationMembershipMutationState,
  type AdminOrganisationMembershipRole,
  type AdminOrganisationMembershipStatus,
  type AdminOrganisationMembershipCandidate,
} from '@/lib/admin/domain/organisation-memberships'
import { describeDatabaseError, queryDb, withTransaction } from '@/lib/db'

interface AdminIdentityRow {
  id: string
  email: string
  full_name: string
  identity_type: string
  status: string
  auth_subject: string | null
  last_activity_at: string | Date | null
}

interface OrganisationMembershipRow {
  id: string
  organisation_id: string
  identity_id: string
  membership_role: string
  membership_status: AdminOrganisationMembershipStatus
  joined_at: string | Date | null
  invited_at: string | Date | null
}

interface OrganisationMembershipCandidateRow {
  id: string | null
  email: string | null
  full_name: string | null
  status: string | null
  auth_subject: string | null
  last_activity_at: string | Date | null
  membership_status: string | null
  membership_role: string | null
}

interface AdminIdentityActorRow {
  id: string
  email: string
  full_name: string
}

interface AdminOrganisationMembershipMutationResult {
  ok: boolean
  code:
    | 'added'
    | 'invited'
    | 'reactivated'
    | 'role_updated'
    | 'status_updated'
    | 'removed'
    | 'validation_error'
    | 'permission_denied'
    | 'not_found'
    | 'duplicate_membership'
    | 'target_user_not_found'
    | 'unknown_error'
  message: string
  membershipId?: string
  organisationId?: string
  identityId?: string
  mutation?: string
  fieldErrors?: AdminOrganisationMembershipMutationState['fieldErrors']
}

interface OrganisationMembershipMutationDependencies {
  resolveAdminAccess: () => Promise<AdminAccessContext>
  getActorIdentity: (client: PoolClient) => Promise<AdminIdentityActorRow | null>
  queryDb: typeof queryDb
  withTransaction: typeof withTransaction
  now: () => Date
  createId: () => string
}

const defaultDependencies: OrganisationMembershipMutationDependencies = {
  resolveAdminAccess: () => resolveAdminAccess(),
  getActorIdentity: ensureAdminAuditActor,
  queryDb,
  withTransaction,
  now: () => new Date(),
  createId: () => crypto.randomUUID(),
}

const VALID_MUTATION_STATUSES: readonly AdminOrganisationMembershipStatus[] = ['active', 'invited', 'inactive', 'suspended']

function normaliseWhitespace(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function normaliseEmail(value: string | null | undefined): string {
  return normaliseWhitespace(value).toLowerCase()
}

function normaliseTimestamp(value: string | Date | null | undefined): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
  }

  return Number.isNaN(value.getTime()) ? null : value.toISOString()
}

function isMembershipRole(value: string | null | undefined): value is AdminOrganisationMembershipRole {
  return (ADMIN_ORGANISATION_MEMBERSHIP_ROLES as readonly string[]).includes(value ?? '')
}

function isMembershipStatus(value: string | null | undefined): value is AdminOrganisationMembershipStatus {
  return (VALID_MUTATION_STATUSES as readonly string[]).includes(value ?? '')
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

async function ensureAdminAuditActor(client: PoolClient): Promise<AdminIdentityActorRow | null> {
  const [{ userId }, clerkUser] = await Promise.all([auth(), currentUser()])
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? null
  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim()
    || clerkUser?.fullName?.trim()
    || email
    || 'Sonartra Admin'

  if (!email) {
    return null
  }

  const existing = await client.query<AdminIdentityActorRow>(
    `select id, email, full_name
     from admin_identities
     where auth_subject = $1 or email = $2
     order by case when auth_subject = $1 then 0 else 1 end
     limit 1`,
    [userId, email],
  )

  if (existing.rows[0]) {
    if (userId) {
      await client.query(
        `update admin_identities
         set auth_provider = coalesce(auth_provider, 'clerk'),
             auth_subject = coalesce(auth_subject, $2),
             full_name = case when full_name = '' then $3 else full_name end,
             status = case when status = 'invited' then 'active' else status end
         where id = $1`,
        [existing.rows[0].id, userId, fullName],
      )
    }

    return existing.rows[0]
  }

  if (!userId) {
    return null
  }

  const inserted = await client.query<AdminIdentityActorRow>(
    `insert into admin_identities (id, email, full_name, identity_type, auth_provider, auth_subject, status, last_activity_at, created_at)
     values ($1, $2, $3, 'internal', 'clerk', $4, 'active', $5, $5)
     returning id, email, full_name`,
    [crypto.randomUUID(), email, fullName, userId, new Date().toISOString()],
  )

  return inserted.rows[0] ?? null
}

async function requireAccess(deps: OrganisationMembershipMutationDependencies) {
  const access = await deps.resolveAdminAccess()

  if (!access.isAuthenticated || !access.isAllowed) {
    return {
      ok: false,
      code: 'permission_denied',
      message: 'You do not have permission to manage organisation memberships.',
    } satisfies AdminOrganisationMembershipMutationResult
  }

  return null
}

async function getOrganisation(client: PoolClient, organisationId: string): Promise<{ id: string; name: string } | null> {
  const result = await client.query<{ id: string; name: string }>(
    `select id, name
     from organisations
     where id = $1
     limit 1`,
    [organisationId],
  )

  return result.rows[0] ?? null
}

async function syncOrganisationScopedRoleAssignment(
  client: PoolClient,
  input: { identityId: string; organisationId: string; role: AdminOrganisationMembershipRole; createId: () => string; nowIso: string },
) {
  await client.query(
    `delete from admin_identity_roles
     where identity_id = $1
       and organisation_id = $2`,
    [input.identityId, input.organisationId],
  )

  await client.query(
    `insert into admin_identity_roles (id, identity_id, role_id, organisation_id, assigned_at)
     select $1, $2, ar.id, $3, $4::timestamptz
     from admin_roles ar
     where ar.key = $5
       and ar.scope_type = 'organisation'
     limit 1`,
    [input.createId(), input.identityId, input.organisationId, input.nowIso, input.role],
  )
}

async function writeAuditEvent(
  client: PoolClient,
  input: {
    createId: () => string
    nowIso: string
    actor: AdminIdentityActorRow | null
    organisationId: string
    identityId: string
    eventType: string
    summary: string
    metadata: Record<string, unknown>
  },
) {
  if (!input.actor) {
    return
  }

  await client.query(
    `insert into access_audit_events (
       id,
       identity_id,
       organisation_id,
       event_type,
       event_summary,
       actor_name,
       actor_identity_id,
       happened_at,
       metadata
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8::timestamptz, $9::jsonb)`,
    [
      input.createId(),
      input.identityId,
      input.organisationId,
      input.eventType,
      input.summary,
      input.actor.full_name,
      input.actor.id,
      input.nowIso,
      JSON.stringify(input.metadata),
    ],
  )
}

export async function getAdminOrganisationMembershipCandidates(
  organisationId: string,
  search = '',
): Promise<AdminOrganisationMembershipCandidate[]> {
  const needle = normaliseWhitespace(search)
  const pattern = needle ? `%${needle.replace(/[%_]/g, '\\$&')}%` : null

  const result = await queryDb<OrganisationMembershipCandidateRow>(
    `select
       ai.id,
       ai.email,
       ai.full_name,
       ai.status,
       ai.auth_subject,
       ai.last_activity_at,
       om.membership_status,
       om.membership_role
     from admin_identities ai
     left join organisation_memberships om
       on om.identity_id = ai.id
      and om.organisation_id = $1
     where ai.identity_type = 'organisation'
       and (
         $2::text is null
         or ai.full_name ilike $2 escape '\\'
         or ai.email ilike $2 escape '\\'
       )
     order by
       case when om.membership_status = 'active' then 1 else 0 end,
       case when ai.auth_subject is null then 1 else 0 end,
       lower(ai.full_name) asc,
       lower(ai.email) asc
     limit 24`,
    [organisationId, pattern],
  )

  return (result.rows ?? []).flatMap((row) => {
    if (!row.id || !row.email || !row.full_name || !row.status) {
      return []
    }

    return [{
      identityId: row.id,
      fullName: row.full_name,
      email: row.email,
      identityStatus: row.status,
      authBound: Boolean(row.auth_subject),
      membershipStatus: isMembershipStatus(row.membership_status) ? row.membership_status : null,
      membershipRole: row.membership_role,
      lastActivityAt: normaliseTimestamp(row.last_activity_at),
    }]
  })
}

export async function addAdminOrganisationMembership(
  values: { organisationId: string; identityId: string; role: string },
  dependencies: Partial<OrganisationMembershipMutationDependencies> = {},
): Promise<AdminOrganisationMembershipMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  const identityId = normaliseWhitespace(values.identityId)

  if (!identityId) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Select a directory user to add.',
      fieldErrors: { identityId: 'Select a directory user to add.' },
    }
  }

  if (!isMembershipRole(values.role)) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Select a supported organisation role.',
      fieldErrors: { role: 'Select a supported organisation role.' },
    }
  }

  const role = values.role as AdminOrganisationMembershipRole

  try {
    return await deps.withTransaction(async (client) => {
      const organisation = await getOrganisation(client, values.organisationId)

      if (!organisation) {
        return {
          ok: false,
          code: 'not_found',
          message: 'Organisation not found.',
        } satisfies AdminOrganisationMembershipMutationResult
      }

      const identityResult = await client.query<AdminIdentityRow>(
        `select id, email, full_name, identity_type, status, auth_subject, last_activity_at
         from admin_identities
         where id = $1
         limit 1`,
        [identityId],
      )
      const identity = identityResult.rows[0]

      if (!identity || identity.identity_type !== 'organisation') {
        return {
          ok: false,
          code: 'target_user_not_found',
          message: 'The selected directory user was not found.',
          fieldErrors: { identityId: 'The selected directory user was not found.' },
        } satisfies AdminOrganisationMembershipMutationResult
      }

      const membershipResult = await client.query<OrganisationMembershipRow>(
        `select id, organisation_id, identity_id, membership_role, membership_status, joined_at, invited_at
         from organisation_memberships
         where organisation_id = $1 and identity_id = $2
         limit 1
         for update`,
        [values.organisationId, identityId],
      )
      const existingMembership = membershipResult.rows[0] ?? null
      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()

      if (existingMembership?.membership_status === 'active') {
        return {
          ok: false,
          code: 'duplicate_membership',
          message: `${identity.full_name} already has active access to ${organisation.name}.`,
          fieldErrors: { identityId: `${identity.full_name} already has active access to ${organisation.name}.` },
        } satisfies AdminOrganisationMembershipMutationResult
      }

      const nextStatus: AdminOrganisationMembershipStatus = 'active'
      const nextJoinedAt = existingMembership?.joined_at ? normaliseTimestamp(existingMembership.joined_at) ?? nowIso : nowIso
      const nextInvitedAt = existingMembership?.invited_at ? normaliseTimestamp(existingMembership.invited_at) : nowIso

      await client.query(
        `update admin_identities
         set status = case when auth_subject is not null then 'active' else status end
         where id = $1`,
        [identityId],
      )

      let membershipId = existingMembership?.id ?? deps.createId()

      if (existingMembership) {
        await client.query(
          `update organisation_memberships
           set membership_role = $3,
               membership_status = $4,
               joined_at = $5::timestamptz,
               invited_at = coalesce(invited_at, $6::timestamptz),
               last_activity_at = coalesce(last_activity_at, $5::timestamptz)
           where organisation_id = $1 and identity_id = $2`,
          [values.organisationId, identityId, role, nextStatus, nextJoinedAt, nextInvitedAt],
        )
      } else {
        await client.query(
          `insert into organisation_memberships (
             id,
             identity_id,
             organisation_id,
             membership_role,
             membership_status,
             joined_at,
             invited_at,
             last_activity_at
           )
           values ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $6::timestamptz)`,
          [membershipId, identityId, values.organisationId, role, nextStatus, nextJoinedAt, nextInvitedAt],
        )
      }

      await syncOrganisationScopedRoleAssignment(client, {
        identityId,
        organisationId: values.organisationId,
        role,
        createId: deps.createId,
        nowIso,
      })

      await writeAuditEvent(client, {
        createId: deps.createId,
        nowIso,
        actor,
        organisationId: values.organisationId,
        identityId,
        eventType: existingMembership ? 'membership_reactivated' : 'member_added',
        summary: existingMembership
          ? `${identity.full_name} restored to ${organisation.name} with ${role} access.`
          : `${identity.full_name} added to ${organisation.name} with ${role} access.`,
        metadata: {
          change_type: existingMembership ? 'membership_reactivated' : 'membership_added',
          membershipId,
          email: identity.email,
          role,
          previousStatus: existingMembership?.membership_status ?? null,
          nextStatus,
        },
      })

      return {
        ok: true,
        code: existingMembership ? 'reactivated' : 'added',
        message: existingMembership ? 'Membership restored successfully.' : 'Member added successfully.',
        membershipId,
        organisationId: values.organisationId,
        identityId,
        mutation: existingMembership ? 'member-restored' : 'member-added',
      } satisfies AdminOrganisationMembershipMutationResult
    })
  } catch (error) {
    console.error('[admin-organisation-memberships] Failed to add organisation membership.', {
      organisationId: values.organisationId,
      identityId,
      error: describeDatabaseError(error),
    })

    return {
      ok: false,
      code: 'unknown_error',
      message: 'The organisation membership could not be created. Try again.',
    }
  }
}

export async function inviteAdminOrganisationMember(
  values: { organisationId: string; email: string; fullName: string; role: string },
  dependencies: Partial<OrganisationMembershipMutationDependencies> = {},
): Promise<AdminOrganisationMembershipMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  const email = normaliseEmail(values.email)
  const fullName = normaliseWhitespace(values.fullName)

  if (!fullName || fullName.length < 2) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Enter the member’s full name.',
      fieldErrors: { fullName: 'Enter the member’s full name.' },
    }
  }

  if (!isValidEmail(email)) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Enter a valid email address.',
      fieldErrors: { email: 'Enter a valid email address.' },
    }
  }

  if (!isMembershipRole(values.role)) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Select a supported organisation role.',
      fieldErrors: { role: 'Select a supported organisation role.' },
    }
  }

  const role = values.role as AdminOrganisationMembershipRole

  try {
    return await deps.withTransaction(async (client) => {
      const organisation = await getOrganisation(client, values.organisationId)

      if (!organisation) {
        return {
          ok: false,
          code: 'not_found',
          message: 'Organisation not found.',
        } satisfies AdminOrganisationMembershipMutationResult
      }

      const identityResult = await client.query<AdminIdentityRow>(
        `select id, email, full_name, identity_type, status, auth_subject, last_activity_at
         from admin_identities
         where lower(email) = $1
         limit 1`,
        [email],
      )
      let identity = identityResult.rows[0] ?? null
      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()

      if (identity && identity.identity_type !== 'organisation') {
        return {
          ok: false,
          code: 'validation_error',
          message: 'That email is already assigned to an internal Sonartra admin identity.',
          fieldErrors: { email: 'That email is already assigned to an internal Sonartra admin identity.' },
        } satisfies AdminOrganisationMembershipMutationResult
      }

      if (!identity) {
        const insertIdentity = await client.query<AdminIdentityRow>(
          `insert into admin_identities (
             id,
             email,
             full_name,
             identity_type,
             auth_provider,
             auth_subject,
             status,
             last_activity_at,
             created_at
           )
           values ($1, $2, $3, 'organisation', null, null, 'invited', null, $4::timestamptz)
           returning id, email, full_name, identity_type, status, auth_subject, last_activity_at`,
          [deps.createId(), email, fullName, nowIso],
        )

        identity = insertIdentity.rows[0] ?? null
      } else if (identity.full_name !== fullName && identity.status === 'invited') {
        const updatedIdentity = await client.query<AdminIdentityRow>(
          `update admin_identities
           set full_name = $2
           where id = $1
           returning id, email, full_name, identity_type, status, auth_subject, last_activity_at`,
          [identity.id, fullName],
        )
        identity = updatedIdentity.rows[0] ?? identity
      }

      if (!identity) {
        return {
          ok: false,
          code: 'target_user_not_found',
          message: 'The target user could not be prepared for invitation.',
        } satisfies AdminOrganisationMembershipMutationResult
      }

      const membershipResult = await client.query<OrganisationMembershipRow>(
        `select id, organisation_id, identity_id, membership_role, membership_status, joined_at, invited_at
         from organisation_memberships
         where organisation_id = $1 and identity_id = $2
         limit 1
         for update`,
        [values.organisationId, identity.id],
      )
      const existingMembership = membershipResult.rows[0] ?? null
      const targetStatus: AdminOrganisationMembershipStatus = identity.auth_subject ? 'active' : 'invited'

      if (existingMembership?.membership_status === 'active' && targetStatus === 'active') {
        return {
          ok: false,
          code: 'duplicate_membership',
          message: `${identity.full_name} already has active access to ${organisation.name}.`,
          fieldErrors: { email: `${identity.full_name} already has active access to ${organisation.name}.` },
        } satisfies AdminOrganisationMembershipMutationResult
      }

      let membershipId = existingMembership?.id ?? deps.createId()
      const joinedAt = targetStatus === 'active'
        ? (existingMembership?.joined_at ? normaliseTimestamp(existingMembership.joined_at) ?? nowIso : nowIso)
        : existingMembership?.joined_at ? normaliseTimestamp(existingMembership.joined_at) : null
      const invitedAt = existingMembership?.invited_at ? normaliseTimestamp(existingMembership.invited_at) ?? nowIso : nowIso

      if (identity.auth_subject) {
        await client.query(
          `update admin_identities
           set status = 'active'
           where id = $1`,
          [identity.id],
        )
      }

      if (existingMembership) {
        await client.query(
          `update organisation_memberships
           set membership_role = $3,
               membership_status = $4,
               invited_at = coalesce(invited_at, $5::timestamptz),
               joined_at = case when $6::timestamptz is null then joined_at else coalesce(joined_at, $6::timestamptz) end,
               last_activity_at = case when $6::timestamptz is null then last_activity_at else coalesce(last_activity_at, $6::timestamptz) end
           where organisation_id = $1 and identity_id = $2`,
          [values.organisationId, identity.id, role, targetStatus, invitedAt, joinedAt],
        )
      } else {
        await client.query(
          `insert into organisation_memberships (
             id,
             identity_id,
             organisation_id,
             membership_role,
             membership_status,
             joined_at,
             invited_at,
             last_activity_at
           )
           values ($1, $2, $3, $4, $5, $6::timestamptz, $7::timestamptz, $8::timestamptz)`,
          [membershipId, identity.id, values.organisationId, role, targetStatus, joinedAt, invitedAt, joinedAt],
        )
      }

      await syncOrganisationScopedRoleAssignment(client, {
        identityId: identity.id,
        organisationId: values.organisationId,
        role,
        createId: deps.createId,
        nowIso,
      })

      const invited = targetStatus === 'invited'
      await writeAuditEvent(client, {
        createId: deps.createId,
        nowIso,
        actor,
        organisationId: values.organisationId,
        identityId: identity.id,
        eventType: invited ? 'invitation_created' : existingMembership ? 'membership_reactivated' : 'member_added',
        summary: invited
          ? `${identity.full_name} invited to ${organisation.name} with ${role} access.`
          : existingMembership
            ? `${identity.full_name} restored to ${organisation.name} with ${role} access.`
            : `${identity.full_name} added to ${organisation.name} with ${role} access.`,
        metadata: {
          change_type: invited ? 'membership_invited' : existingMembership ? 'membership_reactivated' : 'membership_added',
          membershipId,
          email: identity.email,
          role,
          previousStatus: existingMembership?.membership_status ?? null,
          nextStatus: targetStatus,
          delivery: 'not_sent',
        },
      })

      return {
        ok: true,
        code: invited ? 'invited' : existingMembership ? 'reactivated' : 'added',
        message: invited ? 'Invitation created successfully.' : 'Member linked successfully.',
        membershipId,
        organisationId: values.organisationId,
        identityId: identity.id,
        mutation: invited ? 'member-invited' : existingMembership ? 'member-restored' : 'member-added',
      } satisfies AdminOrganisationMembershipMutationResult
    })
  } catch (error) {
    console.error('[admin-organisation-memberships] Failed to invite organisation member.', {
      organisationId: values.organisationId,
      email,
      error: describeDatabaseError(error),
    })

    return {
      ok: false,
      code: 'unknown_error',
      message: 'The member could not be invited. Try again.',
    }
  }
}

export async function updateAdminOrganisationMembershipRole(
  values: { organisationId: string; identityId: string; role: string },
  dependencies: Partial<OrganisationMembershipMutationDependencies> = {},
): Promise<AdminOrganisationMembershipMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  const identityId = normaliseWhitespace(values.identityId)

  if (!identityId) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Select a membership to update.',
      fieldErrors: { identityId: 'Select a membership to update.' },
    }
  }

  if (!isMembershipRole(values.role)) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Select a supported organisation role.',
      fieldErrors: { role: 'Select a supported organisation role.' },
    }
  }

  const role = values.role as AdminOrganisationMembershipRole

  try {
    return await deps.withTransaction(async (client) => {
      const organisation = await getOrganisation(client, values.organisationId)

      if (!organisation) {
        return {
          ok: false,
          code: 'not_found',
          message: 'Organisation not found.',
        } satisfies AdminOrganisationMembershipMutationResult
      }

      const membershipResult = await client.query<OrganisationMembershipRow & { full_name: string; email: string }>(
        `select om.id, om.organisation_id, om.identity_id, om.membership_role, om.membership_status, om.joined_at, om.invited_at, ai.full_name, ai.email
         from organisation_memberships om
         inner join admin_identities ai on ai.id = om.identity_id
         where om.organisation_id = $1 and om.identity_id = $2
         limit 1
         for update`,
        [values.organisationId, identityId],
      )
      const membership = membershipResult.rows[0] ?? null

      if (!membership) {
        return {
          ok: false,
          code: 'not_found',
          message: 'Membership not found.',
          fieldErrors: { identityId: 'Membership not found.' },
        } satisfies AdminOrganisationMembershipMutationResult
      }

      if (membership.membership_role === values.role) {
        return {
          ok: false,
          code: 'validation_error',
          message: 'This membership already uses that role.',
          fieldErrors: { role: 'This membership already uses that role.' },
        } satisfies AdminOrganisationMembershipMutationResult
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()

      await client.query(
        `update organisation_memberships
         set membership_role = $3
         where organisation_id = $1 and identity_id = $2`,
        [values.organisationId, identityId, role],
      )

      await syncOrganisationScopedRoleAssignment(client, {
        identityId,
        organisationId: values.organisationId,
        role,
        createId: deps.createId,
        nowIso,
      })

      await writeAuditEvent(client, {
        createId: deps.createId,
        nowIso,
        actor,
        organisationId: values.organisationId,
        identityId,
        eventType: 'membership_role_changed',
        summary: `${membership.full_name} role changed from ${membership.membership_role} to ${role}.`,
        metadata: {
          change_type: 'membership_role_changed',
          membershipId: membership.id,
          email: membership.email,
          previousRole: membership.membership_role,
          nextRole: role,
          membershipStatus: membership.membership_status,
        },
      })

      return {
        ok: true,
        code: 'role_updated',
        message: 'Membership role updated successfully.',
        membershipId: membership.id,
        organisationId: values.organisationId,
        identityId,
        mutation: 'member-role-updated',
      } satisfies AdminOrganisationMembershipMutationResult
    })
  } catch (error) {
    console.error('[admin-organisation-memberships] Failed to update membership role.', {
      organisationId: values.organisationId,
      identityId,
      error: describeDatabaseError(error),
    })

    return {
      ok: false,
      code: 'unknown_error',
      message: 'The membership role could not be updated. Try again.',
    }
  }
}

export async function updateAdminOrganisationMembershipStatus(
  values: { organisationId: string; identityId: string; nextStatus: string; confirmation?: string },
  dependencies: Partial<OrganisationMembershipMutationDependencies> = {},
): Promise<AdminOrganisationMembershipMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  const identityId = normaliseWhitespace(values.identityId)

  if (!identityId) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Select a membership to update.',
      fieldErrors: { identityId: 'Select a membership to update.' },
    }
  }

  if (!isMembershipStatus(values.nextStatus)) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Select a supported membership state.',
      fieldErrors: { action: 'Select a supported membership state.' },
    }
  }

  if (values.nextStatus === 'inactive' && values.confirmation !== 'confirm') {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Confirm removal before continuing.',
      fieldErrors: { confirmation: 'Confirm removal before continuing.' },
    }
  }

  try {
    return await deps.withTransaction(async (client) => {
      const organisation = await getOrganisation(client, values.organisationId)

      if (!organisation) {
        return {
          ok: false,
          code: 'not_found',
          message: 'Organisation not found.',
        } satisfies AdminOrganisationMembershipMutationResult
      }

      const membershipResult = await client.query<OrganisationMembershipRow & { full_name: string; email: string }>(
        `select om.id, om.organisation_id, om.identity_id, om.membership_role, om.membership_status, om.joined_at, om.invited_at, ai.full_name, ai.email
         from organisation_memberships om
         inner join admin_identities ai on ai.id = om.identity_id
         where om.organisation_id = $1 and om.identity_id = $2
         limit 1
         for update`,
        [values.organisationId, identityId],
      )
      const membership = membershipResult.rows[0] ?? null

      if (!membership) {
        return {
          ok: false,
          code: 'not_found',
          message: 'Membership not found.',
          fieldErrors: { identityId: 'Membership not found.' },
        } satisfies AdminOrganisationMembershipMutationResult
      }

      if (membership.membership_status === values.nextStatus) {
        return {
          ok: false,
          code: 'validation_error',
          message: 'This membership is already in that state.',
          fieldErrors: { action: 'This membership is already in that state.' },
        } satisfies AdminOrganisationMembershipMutationResult
      }

      const actor = await deps.getActorIdentity(client)
      const nowIso = deps.now().toISOString()
      const joinedAt = values.nextStatus === 'active'
        ? normaliseTimestamp(membership.joined_at) ?? nowIso
        : normaliseTimestamp(membership.joined_at)
      const invitedAt = normaliseTimestamp(membership.invited_at)

      await client.query(
        `update organisation_memberships
         set membership_status = $3,
             joined_at = case when $3 = 'active' then coalesce(joined_at, $4::timestamptz) else joined_at end,
             invited_at = case when $3 = 'invited' then coalesce(invited_at, $5::timestamptz) else invited_at end
         where organisation_id = $1 and identity_id = $2`,
        [values.organisationId, identityId, values.nextStatus, joinedAt, invitedAt ?? nowIso],
      )

      const removing = values.nextStatus === 'inactive'
      if (removing) {
        await client.query(
          `delete from admin_identity_roles
           where identity_id = $1
             and organisation_id = $2`,
          [identityId, values.organisationId],
        )
      } else {
        await syncOrganisationScopedRoleAssignment(client, {
          identityId,
          organisationId: values.organisationId,
          role: membership.membership_role as AdminOrganisationMembershipRole,
          createId: deps.createId,
          nowIso,
        })
      }

      const eventType = values.nextStatus === 'suspended'
        ? 'membership_suspended'
        : values.nextStatus === 'active'
          ? 'membership_restored'
          : values.nextStatus === 'invited'
            ? 'invitation_created'
            : 'membership_removed'
      const summary = values.nextStatus === 'suspended'
        ? `${membership.full_name} suspended from ${organisation.name}.`
        : values.nextStatus === 'active'
          ? `${membership.full_name} restored to active access in ${organisation.name}.`
          : values.nextStatus === 'invited'
            ? `${membership.full_name} returned to invited access in ${organisation.name}.`
            : `${membership.full_name} removed from ${organisation.name}.`

      await writeAuditEvent(client, {
        createId: deps.createId,
        nowIso,
        actor,
        organisationId: values.organisationId,
        identityId,
        eventType,
        summary,
        metadata: {
          change_type: eventType,
          membershipId: membership.id,
          email: membership.email,
          role: membership.membership_role,
          previousStatus: membership.membership_status,
          nextStatus: values.nextStatus,
        },
      })

      return {
        ok: true,
        code: removing ? 'removed' : 'status_updated',
        message: removing ? 'Membership removed successfully.' : 'Membership status updated successfully.',
        membershipId: membership.id,
        organisationId: values.organisationId,
        identityId,
        mutation: values.nextStatus === 'suspended'
          ? 'member-suspended'
          : values.nextStatus === 'active'
            ? 'member-restored'
            : values.nextStatus === 'inactive'
              ? 'member-removed'
              : 'member-invited',
      } satisfies AdminOrganisationMembershipMutationResult
    })
  } catch (error) {
    console.error('[admin-organisation-memberships] Failed to update membership status.', {
      organisationId: values.organisationId,
      identityId,
      nextStatus: values.nextStatus,
      error: describeDatabaseError(error),
    })

    return {
      ok: false,
      code: 'unknown_error',
      message: 'The membership status could not be updated. Try again.',
    }
  }
}

export function buildAdminOrganisationMembershipMutationState(
  result: AdminOrganisationMembershipMutationResult,
): AdminOrganisationMembershipMutationState {
  if (result.ok) {
    return { status: 'idle' }
  }

  return {
    status: 'error',
    message: result.message,
    fieldErrors: result.fieldErrors,
  }
}
