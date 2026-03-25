import { queryDb } from '@/lib/db'

export interface AdminOrganisationRegistryDTO {
  id: string
  name: string
  slug: string
  country?: string | null
  status: string
  planTier?: string | null
  createdAt: string
  updatedAt: string
  membershipCount: number
  activeMembershipCount: number
  invitedMembershipCount: number
  inactiveMembershipCount: number
  ownerCount: number
  adminCount: number
  multiOrgMemberCount: number
  lastMembershipActivityAt?: string | null
  lastAuditActivityAt?: string | null
}

interface OrganisationRegistryRow {
  id: string | null
  name: string | null
  slug: string | null
  country: string | null
  status: string | null
  plan_tier: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
  membership_count: number | string | null
  active_membership_count: number | string | null
  invited_membership_count: number | string | null
  inactive_membership_count: number | string | null
  owner_count: number | string | null
  admin_count: number | string | null
  multi_org_member_count: number | string | null
  last_membership_activity_at: string | Date | null
  last_audit_activity_at: string | Date | null
}

type TimestampInput = string | Date | null | undefined

function logOrganisationRegistryInvariant(message: string, details?: Record<string, unknown>) {
  console.error(`[admin-organisation-registry] ${message}`, details ?? {})
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
    logOrganisationRegistryInvariant(`Missing required ${fieldName} while assembling organisation registry data.`, details)
    return null
  }

  return trimmed
}

function normaliseOptionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normaliseCount(value: number | string | null | undefined, fieldName: string, details?: Record<string, unknown>): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value)

    if (Number.isFinite(parsed)) {
      return parsed
    }
  }

  logOrganisationRegistryInvariant(`Missing or invalid ${fieldName} while assembling organisation registry data.`, details)
  return 0
}

export function mapOrganisationRegistryRows(rows: OrganisationRegistryRow[]): AdminOrganisationRegistryDTO[] {
  return (rows ?? []).flatMap((row) => {
    const id = normaliseRequiredString(row.id, 'organisation.id', { row })
    const name = normaliseRequiredString(row.name, 'organisation.name', { row })
    const slug = normaliseRequiredString(row.slug, 'organisation.slug', { row })
    const status = normaliseRequiredString(row.status, 'organisation.status', { row })
    const createdAt = normaliseTimestamp(row.created_at)
    const updatedAt = normaliseTimestamp(row.updated_at)

    if (!id || !name || !slug || !status || !createdAt || !updatedAt) {
      if (!createdAt || !updatedAt) {
        logOrganisationRegistryInvariant('Missing or invalid organisation timestamps while assembling registry data.', { row })
      }
      return []
    }

    return [{
      id,
      name,
      slug,
      country: normaliseOptionalString(row.country),
      status,
      planTier: normaliseOptionalString(row.plan_tier),
      createdAt,
      updatedAt,
      membershipCount: normaliseCount(row.membership_count, 'organisation.membership_count', { organisationId: id }),
      activeMembershipCount: normaliseCount(row.active_membership_count, 'organisation.active_membership_count', { organisationId: id }),
      invitedMembershipCount: normaliseCount(row.invited_membership_count, 'organisation.invited_membership_count', { organisationId: id }),
      inactiveMembershipCount: normaliseCount(row.inactive_membership_count, 'organisation.inactive_membership_count', { organisationId: id }),
      ownerCount: normaliseCount(row.owner_count, 'organisation.owner_count', { organisationId: id }),
      adminCount: normaliseCount(row.admin_count, 'organisation.admin_count', { organisationId: id }),
      multiOrgMemberCount: normaliseCount(row.multi_org_member_count, 'organisation.multi_org_member_count', { organisationId: id }),
      lastMembershipActivityAt: normaliseTimestamp(row.last_membership_activity_at),
      lastAuditActivityAt: normaliseTimestamp(row.last_audit_activity_at),
    }]
  })
}

export async function getAdminOrganisationRegistryData(): Promise<AdminOrganisationRegistryDTO[]> {
  const result = await queryDb<OrganisationRegistryRow>(`
    with membership_scope as (
      select
        identity_id,
        count(*)::int as membership_total
      from organisation_memberships
      group by identity_id
    ),
    membership_stats as (
      select
        om.organisation_id,
        count(*)::int as membership_count,
        count(*) filter (where om.membership_status = 'active')::int as active_membership_count,
        count(*) filter (where om.membership_status = 'invited')::int as invited_membership_count,
        count(*) filter (where om.membership_status in ('inactive', 'suspended'))::int as inactive_membership_count,
        count(*) filter (where om.membership_role = 'owner' and om.membership_status = 'active')::int as owner_count,
        count(*) filter (where om.membership_role = 'admin' and om.membership_status = 'active')::int as admin_count,
        count(distinct case when membership_scope.membership_total > 1 then om.identity_id end)::int as multi_org_member_count,
        max(om.last_activity_at) as last_membership_activity_at
      from organisation_memberships om
      left join membership_scope on membership_scope.identity_id = om.identity_id
      group by om.organisation_id
    ),
    audit_stats as (
      select
        organisation_id,
        max(happened_at) as last_audit_activity_at
      from access_audit_events
      where organisation_id is not null
      group by organisation_id
    )
    select
      o.id,
      o.name,
      o.slug,
      o.country,
      o.status,
      o.plan_tier,
      o.created_at,
      o.updated_at,
      coalesce(ms.membership_count, 0) as membership_count,
      coalesce(ms.active_membership_count, 0) as active_membership_count,
      coalesce(ms.invited_membership_count, 0) as invited_membership_count,
      coalesce(ms.inactive_membership_count, 0) as inactive_membership_count,
      coalesce(ms.owner_count, 0) as owner_count,
      coalesce(ms.admin_count, 0) as admin_count,
      coalesce(ms.multi_org_member_count, 0) as multi_org_member_count,
      ms.last_membership_activity_at,
      audit_stats.last_audit_activity_at
    from organisations o
    left join membership_stats ms on ms.organisation_id = o.id
    left join audit_stats on audit_stats.organisation_id = o.id
    order by lower(o.name) asc
  `)

  return mapOrganisationRegistryRows(result.rows ?? [])
}

export const listAdminOrganisations = getAdminOrganisationRegistryData
