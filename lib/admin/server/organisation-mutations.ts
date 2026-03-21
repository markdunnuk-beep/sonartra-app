import { auth, currentUser } from '@clerk/nextjs/server'
import type { PoolClient } from 'pg'
import { resolveAdminAccess, type AdminAccessContext } from '@/lib/admin/access'
import {
  ADMIN_ORGANISATION_MUTABLE_STATUSES,
  type AdminOrganisationMutableStatus,
  type AdminOrganisationMutationState,
} from '@/lib/admin/domain/organisation-mutations'
import { describeDatabaseError, queryDb, withTransaction } from '@/lib/db'

interface OrganisationRow {
  id: string
  name: string
  slug: string
  status: string
  country: string | null
  plan_tier: string | null
  seat_band: string | null
  updated_at: string | Date
}

interface AdminIdentityRow {
  id: string
  email: string
  full_name: string
}

export interface AdminOrganisationFormValues {
  organisationId: string
  name: string
  slug: string
  status: string
  country: string
  planTier: string
  seatBand: string
  expectedUpdatedAt?: string
}

export interface AdminOrganisationMutationResult {
  ok: boolean
  code:
    | 'updated'
    | 'status_changed'
    | 'validation_error'
    | 'permission_denied'
    | 'not_found'
    | 'slug_conflict'
    | 'no_op'
    | 'concurrent_update'
    | 'unknown_error'
  message: string
  organisationId?: string
  nextStatus?: string
  fieldErrors?: AdminOrganisationMutationState['fieldErrors']
}

interface OrganisationMutationDependencies {
  resolveAdminAccess: () => Promise<AdminAccessContext>
  getActorIdentity: (client: PoolClient) => Promise<AdminIdentityRow | null>
  queryDb: typeof queryDb
  withTransaction: typeof withTransaction
  now: () => Date
  createId: () => string
}

const defaultDependencies: OrganisationMutationDependencies = {
  resolveAdminAccess: () => resolveAdminAccess(),
  getActorIdentity: ensureAdminAuditActor,
  queryDb,
  withTransaction,
  now: () => new Date(),
  createId: () => crypto.randomUUID(),
}

function normaliseWhitespace(value: string | null | undefined): string {
  return value?.trim() ?? ''
}

function normaliseNullableField(value: string | null | undefined): string | null {
  const trimmed = normaliseWhitespace(value)
  return trimmed ? trimmed : null
}

function normaliseSlug(value: string | null | undefined): string {
  return normaliseWhitespace(value).toLowerCase()
}

function isMutableStatus(status: string): status is AdminOrganisationMutableStatus {
  return (ADMIN_ORGANISATION_MUTABLE_STATUSES as readonly string[]).includes(status)
}

function extractDatabaseErrorCode(error: unknown): string | null {
  if (!error || typeof error !== 'object') {
    return null
  }

  if ('code' in error && typeof (error as { code?: unknown }).code === 'string') {
    return (error as { code: string }).code
  }

  if ('cause' in error) {
    return extractDatabaseErrorCode((error as { cause?: unknown }).cause)
  }

  return null
}

function areOrganisationValuesEqual(current: OrganisationRow, next: {
  name: string
  slug: string
  status: string
  country: string | null
  planTier: string | null
  seatBand: string | null
}): boolean {
  return current.name === next.name
    && current.slug === next.slug
    && current.status === next.status
    && (current.country ?? null) === next.country
    && (current.plan_tier ?? null) === next.planTier
    && (current.seat_band ?? null) === next.seatBand
}

function validateOrganisationFormValues(values: AdminOrganisationFormValues): AdminOrganisationMutationState['fieldErrors'] {
  const fieldErrors: NonNullable<AdminOrganisationMutationState['fieldErrors']> = {}

  if (normaliseWhitespace(values.name).length < 2) {
    fieldErrors.name = 'Organisation name must contain at least 2 characters.'
  } else if (normaliseWhitespace(values.name).length > 255) {
    fieldErrors.name = 'Organisation name must be 255 characters or fewer.'
  }

  const slug = normaliseSlug(values.slug)
  if (!slug) {
    fieldErrors.slug = 'Slug is required.'
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    fieldErrors.slug = 'Slug must use lowercase letters, numbers, and hyphens only.'
  } else if (slug.length > 255) {
    fieldErrors.slug = 'Slug must be 255 characters or fewer.'
  }

  if (!isMutableStatus(values.status)) {
    fieldErrors.status = 'Select a supported lifecycle status.'
  }

  if (normaliseWhitespace(values.country).length > 120) {
    fieldErrors.country = 'Country must be 120 characters or fewer.'
  }

  if (normaliseWhitespace(values.planTier).length > 100) {
    fieldErrors.planTier = 'Plan tier must be 100 characters or fewer.'
  }

  if (normaliseWhitespace(values.seatBand).length > 100) {
    fieldErrors.seatBand = 'Seat band must be 100 characters or fewer.'
  }

  return Object.keys(fieldErrors).length ? fieldErrors : undefined
}

async function ensureAdminAuditActor(client: PoolClient): Promise<AdminIdentityRow | null> {
  const [{ userId }, clerkUser] = await Promise.all([auth(), currentUser()])
  const email = clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses?.[0]?.emailAddress ?? null
  const fullName = [clerkUser?.firstName, clerkUser?.lastName].filter(Boolean).join(' ').trim()
    || clerkUser?.fullName?.trim()
    || email
    || 'Sonartra Admin'

  if (!email) {
    return null
  }

  const existing = await client.query<AdminIdentityRow>(
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

  const inserted = await client.query<AdminIdentityRow>(
    `insert into admin_identities (id, email, full_name, identity_type, auth_provider, auth_subject, status, last_activity_at, created_at)
     values ($1, $2, $3, 'internal', 'clerk', $4, 'active', $5, $5)
     returning id, email, full_name`,
    [crypto.randomUUID(), email, fullName, userId, new Date().toISOString()],
  )

  return inserted.rows[0] ?? null
}

async function requireAccess(deps: OrganisationMutationDependencies) {
  const access = await deps.resolveAdminAccess()

  if (!access.isAuthenticated || !access.isAllowed) {
    return {
      ok: false,
      code: 'permission_denied',
      message: 'You do not have permission to manage organisations.',
    } satisfies AdminOrganisationMutationResult
  }

  return null
}

export async function updateAdminOrganisation(
  values: AdminOrganisationFormValues,
  dependencies: Partial<OrganisationMutationDependencies> = {},
): Promise<AdminOrganisationMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  const fieldErrors = validateOrganisationFormValues(values)
  if (fieldErrors) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Review the highlighted fields and try again.',
      fieldErrors,
    }
  }

  const currentResult = await deps.queryDb<OrganisationRow>(
    `select id, name, slug, status, country, plan_tier, seat_band, updated_at
     from organisations
     where id = $1
     limit 1`,
    [values.organisationId],
  )

  const current = currentResult.rows[0]
  if (!current) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Organisation not found.',
    }
  }

  const nextValues = {
    name: normaliseWhitespace(values.name),
    slug: normaliseSlug(values.slug),
    status: values.status,
    country: normaliseNullableField(values.country),
    planTier: normaliseNullableField(values.planTier),
    seatBand: normaliseNullableField(values.seatBand),
  }

  if (areOrganisationValuesEqual(current, nextValues)) {
    return {
      ok: false,
      code: 'no_op',
      message: 'No changes were detected for this organisation.',
    }
  }

  if (nextValues.slug !== current.slug) {
    const slugConflict = await deps.queryDb<{ id: string }>(
      `select id from organisations where slug = $1 and id <> $2 limit 1`,
      [nextValues.slug, values.organisationId],
    )

    if (slugConflict.rows[0]) {
      return {
        ok: false,
        code: 'slug_conflict',
        message: 'This slug is already assigned to another organisation.',
        fieldErrors: { slug: 'This slug is already assigned to another organisation.' },
      }
    }
  }

  try {
    const updated = await deps.withTransaction(async (client) => {
      const updateResult = await client.query<OrganisationRow>(
        `update organisations
         set name = $2,
             slug = $3,
             status = $4,
             country = $5,
             plan_tier = $6,
             seat_band = $7,
             updated_at = now()
         where id = $1
           and ($8::timestamptz is null or updated_at = $8::timestamptz)
         returning id, name, slug, status, country, plan_tier, seat_band, updated_at`,
        [
          values.organisationId,
          nextValues.name,
          nextValues.slug,
          nextValues.status,
          nextValues.country,
          nextValues.planTier,
          nextValues.seatBand,
          values.expectedUpdatedAt ?? null,
        ],
      )

      const row = updateResult.rows[0]
      if (!row) {
        return null
      }

      const actor = await deps.getActorIdentity(client)
      if (actor) {
        const changeSummary = [
          nextValues.name !== current.name ? `name to ${nextValues.name}` : null,
          nextValues.slug !== current.slug ? `slug to ${nextValues.slug}` : null,
          nextValues.status !== current.status ? `status to ${nextValues.status}` : null,
        ].filter(Boolean).join(', ')

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
           values ($1, $2, $3, 'organisation_updated', $4, $5, $2, $6, $7::jsonb)`,
          [
            deps.createId(),
            actor.id,
            values.organisationId,
            changeSummary
              ? `Organisation record updated: ${changeSummary}.`
              : 'Organisation record updated.',
            actor.full_name,
            deps.now().toISOString(),
            JSON.stringify({
              change_type: 'organisation_update',
              previous: {
                name: current.name,
                slug: current.slug,
                status: current.status,
                country: current.country,
                planTier: current.plan_tier,
                seatBand: current.seat_band,
              },
              next: nextValues,
            }),
          ],
        )
      }

      return row
    })

    if (!updated) {
      return {
        ok: false,
        code: 'concurrent_update',
        message: 'This organisation was updated elsewhere. Reload and review the latest values before retrying.',
      }
    }

    return {
      ok: true,
      code: 'updated',
      message: 'Organisation updated successfully.',
      organisationId: updated.id,
      nextStatus: updated.status,
    }
  } catch (error) {
    const code = extractDatabaseErrorCode(error)
    if (code === '23505') {
      return {
        ok: false,
        code: 'slug_conflict',
        message: 'This slug is already assigned to another organisation.',
        fieldErrors: { slug: 'This slug is already assigned to another organisation.' },
      }
    }

    console.error('[admin-organisation-mutations] Failed to update organisation.', {
      organisationId: values.organisationId,
      error: describeDatabaseError(error),
    })

    return {
      ok: false,
      code: 'unknown_error',
      message: 'The organisation could not be updated. Try again.',
    }
  }
}

export async function transitionAdminOrganisationStatus(
  values: { organisationId: string; expectedUpdatedAt?: string; targetStatus: string; confirmation?: string },
  dependencies: Partial<OrganisationMutationDependencies> = {},
): Promise<AdminOrganisationMutationResult> {
  const deps = { ...defaultDependencies, ...dependencies }
  const denied = await requireAccess(deps)

  if (denied) {
    return denied
  }

  if (!isMutableStatus(values.targetStatus)) {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Select a supported lifecycle status.',
      fieldErrors: { status: 'Select a supported lifecycle status.' },
    }
  }

  if (values.targetStatus === 'suspended' && values.confirmation !== 'confirm') {
    return {
      ok: false,
      code: 'validation_error',
      message: 'Confirm the lifecycle change before continuing.',
      fieldErrors: { confirmation: 'Confirm the lifecycle change before continuing.' },
    }
  }

  const currentResult = await deps.queryDb<OrganisationRow>(
    `select id, name, slug, status, country, plan_tier, seat_band, updated_at
     from organisations
     where id = $1
     limit 1`,
    [values.organisationId],
  )
  const current = currentResult.rows[0]

  if (!current) {
    return {
      ok: false,
      code: 'not_found',
      message: 'Organisation not found.',
    }
  }

  if (current.status === values.targetStatus) {
    return {
      ok: false,
      code: 'no_op',
      message: 'The organisation is already in that lifecycle state.',
    }
  }

  try {
    const updated = await deps.withTransaction(async (client) => {
      const updateResult = await client.query<OrganisationRow>(
        `update organisations
         set status = $2,
             updated_at = now()
         where id = $1
           and ($3::timestamptz is null or updated_at = $3::timestamptz)
         returning id, name, slug, status, country, plan_tier, seat_band, updated_at`,
        [values.organisationId, values.targetStatus, values.expectedUpdatedAt ?? null],
      )

      const row = updateResult.rows[0]
      if (!row) {
        return null
      }

      const actor = await deps.getActorIdentity(client)
      if (actor) {
        const eventType = values.targetStatus === 'suspended' ? 'organisation_deactivated' : 'organisation_reactivated'
        const summary = values.targetStatus === 'suspended'
          ? `Organisation lifecycle moved from ${current.status} to suspended. Access remains viewable in admin while operational activity is paused.`
          : `Organisation lifecycle moved from ${current.status} to ${values.targetStatus}.`

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
           values ($1, $2, $3, $4, $5, $6, $2, $7, $8::jsonb)`,
          [
            deps.createId(),
            actor.id,
            values.organisationId,
            eventType,
            summary,
            actor.full_name,
            deps.now().toISOString(),
            JSON.stringify({
              change_type: 'organisation_status_transition',
              previousStatus: current.status,
              nextStatus: values.targetStatus,
            }),
          ],
        )
      }

      return row
    })

    if (!updated) {
      return {
        ok: false,
        code: 'concurrent_update',
        message: 'This organisation changed while you were reviewing it. Reload and confirm the latest status before retrying.',
      }
    }

    return {
      ok: true,
      code: 'status_changed',
      message: values.targetStatus === 'suspended'
        ? 'Organisation deactivated successfully.'
        : 'Organisation lifecycle updated successfully.',
      organisationId: updated.id,
      nextStatus: updated.status,
    }
  } catch (error) {
    console.error('[admin-organisation-mutations] Failed to update organisation lifecycle.', {
      organisationId: values.organisationId,
      error: describeDatabaseError(error),
    })

    return {
      ok: false,
      code: 'unknown_error',
      message: 'The lifecycle change could not be completed. Try again.',
    }
  }
}

export function buildAdminOrganisationMutationState(result: AdminOrganisationMutationResult): AdminOrganisationMutationState {
  if (result.ok) {
    return { status: 'idle' }
  }

  return {
    status: 'error',
    message: result.message,
    fieldErrors: result.fieldErrors,
  }
}
