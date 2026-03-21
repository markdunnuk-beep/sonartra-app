import { queryDb } from '@/lib/db'
import {
  buildAdminAuditHref,
  getAdminAuditAppliedFilters,
  getAdminAuditEventLabel,
  getAdminAuditFilters,
  type AdminAuditEntityType,
  type AdminAuditEventRecord,
  type AdminAuditFilters,
  type AdminAuditOrganisationOption,
  type AdminAuditWorkspaceData,
} from '@/lib/admin/domain/audit'
import type { AdminOrganisationActivityRecord } from '@/lib/admin/domain/organisation-detail'

interface AdminAuditEventRow {
  id: string | null
  event_type: string | null
  summary: string | null
  actor_name: string | null
  actor_id: string | null
  happened_at: string | Date | null
  source: 'audit' | 'membership' | 'organisation' | null
  organisation_id: string | null
  organisation_name: string | null
  entity_type: string | null
  entity_id: string | null
  entity_name: string | null
  entity_secondary: string | null
  is_derived: boolean | null
}

interface LabelRow {
  id: string | null
  label: string | null
}

const DERIVED_EVENT_TYPES = ['organisation_created', 'membership_invited', 'membership_joined', 'membership_inactive', 'membership_suspended']

type TimestampInput = string | Date | null | undefined

type AuditSearchParams = Record<string, string | string[] | undefined> | undefined

function logAuditWorkspaceInvariant(message: string, details?: Record<string, unknown>) {
  console.error(`[admin-audit-workspace] ${message}`, details ?? {})
}

function normaliseTimestamp(value: TimestampInput): string | null {
  if (!value) {
    return null
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString()
  }

  return null
}

function normaliseRequiredString(value: string | null | undefined, fieldName: string, details?: Record<string, unknown>): string | null {
  const trimmed = value?.trim()

  if (!trimmed) {
    logAuditWorkspaceInvariant(`Missing required ${fieldName} while assembling admin audit data.`, details)
    return null
  }

  return trimmed
}

function normaliseOptionalString(value: string | null | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function normaliseEntityType(value: string | null, details?: Record<string, unknown>): AdminAuditEntityType | null {
  if (value === 'organisation' || value === 'membership' || value === 'user' || value === 'admin_access') {
    return value
  }

  logAuditWorkspaceInvariant('Unexpected audit entity type encountered while assembling admin audit data.', {
    ...details,
    entityType: value,
  })
  return null
}

function toDateFloor(value: string): string | null {
  if (!value) {
    return null
  }

  const parsed = Date.parse(`${value}T00:00:00.000Z`)
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null
}

function toDateExclusiveCeiling(value: string): string | null {
  if (!value) {
    return null
  }

  const parsed = Date.parse(`${value}T00:00:00.000Z`)

  if (!Number.isFinite(parsed)) {
    return null
  }

  return new Date(parsed + 24 * 60 * 60 * 1000).toISOString()
}

function toQueryPattern(value: string): string | null {
  if (!value.trim()) {
    return null
  }

  return `%${value.trim().replace(/[%_]/g, '\\$&')}%`
}

function getAuditWorkspaceBaseQuery() {
  return `
    with organisation_events as (
      select
        concat('organisation-created-', o.id::text) as id,
        'organisation_created'::text as event_type,
        'Organisation record created.'::text as summary,
        null::text as actor_name,
        null::text as actor_id,
        o.created_at as happened_at,
        'organisation'::text as source,
        o.id::text as organisation_id,
        o.name as organisation_name,
        'organisation'::text as entity_type,
        o.id::text as entity_id,
        o.name as entity_name,
        o.slug as entity_secondary,
        true as is_derived
      from organisations o
    ),
    membership_events as (
      select
        concat('membership-', om.id::text, '-invited') as id,
        'membership_invited'::text as event_type,
        concat(ai.full_name, ' invited with ', om.membership_role, ' access.') as summary,
        null::text as actor_name,
        null::text as actor_id,
        om.invited_at as happened_at,
        'membership'::text as source,
        o.id::text as organisation_id,
        o.name as organisation_name,
        'membership'::text as entity_type,
        om.id::text as entity_id,
        ai.full_name as entity_name,
        ai.email as entity_secondary,
        true as is_derived
      from organisation_memberships om
      inner join admin_identities ai on ai.id = om.identity_id
      inner join organisations o on o.id = om.organisation_id
      where om.invited_at is not null

      union all

      select
        concat('membership-', om.id::text, '-joined') as id,
        'membership_joined'::text as event_type,
        concat(ai.full_name, ' joined with ', om.membership_role, ' access.') as summary,
        null::text as actor_name,
        null::text as actor_id,
        om.joined_at as happened_at,
        'membership'::text as source,
        o.id::text as organisation_id,
        o.name as organisation_name,
        'membership'::text as entity_type,
        om.id::text as entity_id,
        ai.full_name as entity_name,
        ai.email as entity_secondary,
        true as is_derived
      from organisation_memberships om
      inner join admin_identities ai on ai.id = om.identity_id
      inner join organisations o on o.id = om.organisation_id
      where om.joined_at is not null

      union all

      select
        concat('membership-', om.id::text, '-state') as id,
        concat('membership_', om.membership_status) as event_type,
        concat(ai.full_name, ' membership currently marked ', om.membership_status, '.') as summary,
        null::text as actor_name,
        null::text as actor_id,
        coalesce(om.last_activity_at, om.joined_at, om.invited_at) as happened_at,
        'membership'::text as source,
        o.id::text as organisation_id,
        o.name as organisation_name,
        'membership'::text as entity_type,
        om.id::text as entity_id,
        ai.full_name as entity_name,
        ai.email as entity_secondary,
        true as is_derived
      from organisation_memberships om
      inner join admin_identities ai on ai.id = om.identity_id
      inner join organisations o on o.id = om.organisation_id
      where om.membership_status in ('inactive', 'suspended')
    ),
    raw_audit_events as (
      select
        aae.id::text as id,
        aae.event_type,
        aae.event_summary as summary,
        coalesce(aae.actor_name, actor.full_name, actor.email) as actor_name,
        aae.actor_identity_id::text as actor_id,
        aae.happened_at,
        'audit'::text as source,
        aae.organisation_id::text as organisation_id,
        org.name as organisation_name,
        case
          when aae.event_type like 'organisation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'organisation_%' then 'organisation'
          when aae.event_type like 'membership_%' or aae.event_type like 'member_%' or aae.event_type like 'invitation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'membership_%' then 'membership'
          when subject.identity_type = 'internal' and aae.organisation_id is null then 'admin_access'
          else 'user'
        end as entity_type,
        case
          when aae.event_type like 'organisation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'organisation_%' then aae.organisation_id::text
          when aae.event_type like 'membership_%' or aae.event_type like 'member_%' or aae.event_type like 'invitation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'membership_%' then nullif(aae.metadata ->> 'membershipId', '')
          else aae.identity_id::text
        end as entity_id,
        case
          when aae.event_type like 'organisation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'organisation_%' then org.name
          else coalesce(subject.full_name, subject.email, aae.identity_id::text)
        end as entity_name,
        case
          when aae.event_type like 'organisation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'organisation_%' then org.slug
          else subject.email
        end as entity_secondary,
        false as is_derived
      from access_audit_events aae
      left join admin_identities actor on actor.id = aae.actor_identity_id
      left join admin_identities subject on subject.id = aae.identity_id
      left join organisations org on org.id = aae.organisation_id
    ),
    audit_feed as (
      select * from raw_audit_events
      union all
      select * from organisation_events
      union all
      select * from membership_events
    )
  `
}

function getAuditWorkspaceWhereClause() {
  return `
    from audit_feed
    where happened_at is not null
      and ($1::text is null or organisation_id = $1::text)
      and ($2::text is null or actor_id = $2::text)
      and ($3::text is null or entity_type = $3::text)
      and ($4::text is null or entity_id = $4::text)
      and ($5::text is null or event_type = $5::text)
      and ($6::timestamptz is null or happened_at >= $6::timestamptz)
      and ($7::timestamptz is null or happened_at < $7::timestamptz)
      and (
        $8::text is null
        or summary ilike $8 escape '\\'
        or coalesce(actor_name, '') ilike $8 escape '\\'
        or coalesce(organisation_name, '') ilike $8 escape '\\'
        or coalesce(entity_name, '') ilike $8 escape '\\'
        or coalesce(entity_secondary, '') ilike $8 escape '\\'
        or coalesce(entity_id, '') ilike $8 escape '\\'
        or event_type ilike $8 escape '\\'
      )
  `
}

function getAuditWorkspaceQueryParams(filters: AdminAuditFilters): Array<string | number | null> {
  return [
    filters.organisationId || null,
    filters.actorId || null,
    filters.entityType === 'all' ? null : filters.entityType,
    filters.entityId || null,
    filters.eventType || null,
    toDateFloor(filters.dateFrom),
    toDateExclusiveCeiling(filters.dateTo),
    toQueryPattern(filters.query),
  ]
}

export function mapAdminAuditEventRows(rows: AdminAuditEventRow[]): AdminAuditEventRecord[] {
  return (rows ?? []).flatMap((row) => {
    const id = normaliseRequiredString(row.id, 'audit.id', { row })
    const eventType = normaliseRequiredString(row.event_type, 'audit.event_type', { row })
    const summary = normaliseRequiredString(row.summary, 'audit.summary', { row })
    const happenedAt = normaliseTimestamp(row.happened_at)
    const entityType = normaliseEntityType(row.entity_type, { row })
    const source = row.source ?? 'audit'

    if (!id || !eventType || !summary || !happenedAt || !entityType) {
      if (!happenedAt) {
        logAuditWorkspaceInvariant('Missing or invalid audit.happened_at while assembling admin audit data.', { row })
      }

      return []
    }

    return [{
      id,
      eventType,
      eventLabel: getAdminAuditEventLabel(eventType),
      summary,
      actorId: normaliseOptionalString(row.actor_id),
      actorName: normaliseOptionalString(row.actor_name),
      happenedAt,
      source,
      organisationId: normaliseOptionalString(row.organisation_id),
      organisationName: normaliseOptionalString(row.organisation_name),
      entityType,
      entityId: normaliseOptionalString(row.entity_id),
      entityName: normaliseOptionalString(row.entity_name),
      entitySecondary: normaliseOptionalString(row.entity_secondary),
      isDerived: Boolean(row.is_derived),
    }]
  })
}

export function mapAuditEventsToOrganisationActivity(events: AdminAuditEventRecord[]): AdminOrganisationActivityRecord[] {
  return events.map((event) => ({
    id: event.id,
    eventType: event.eventType,
    summary: event.summary,
    actorId: event.actorId,
    actorName: event.actorName,
    happenedAt: event.happenedAt,
    source: event.source,
    organisationId: event.organisationId,
    organisationName: event.organisationName,
    entityType: event.entityType,
    entityId: event.entityId,
    entityName: event.entityName,
  }))
}

async function getAdminAuditEvents(filters: AdminAuditFilters) {
  const baseQuery = getAuditWorkspaceBaseQuery()
  const whereClause = getAuditWorkspaceWhereClause()
  const params = getAuditWorkspaceQueryParams(filters)
  const limit = filters.pageSize
  const offset = (filters.page - 1) * filters.pageSize

  const [rowsResult, countResult] = await Promise.all([
    queryDb<AdminAuditEventRow>(
      `${baseQuery}
       select
         id,
         event_type,
         summary,
         actor_name,
         actor_id,
         happened_at,
         source,
         organisation_id,
         organisation_name,
         entity_type,
         entity_id,
         entity_name,
         entity_secondary,
         is_derived
       ${whereClause}
       order by happened_at desc, id desc
       limit $9
       offset $10`,
      [...params, limit, offset],
    ),
    queryDb<{ total_count: number | string | null }>(
      `${baseQuery}
       select count(*)::int as total_count
       ${whereClause}`,
      params,
    ),
  ])

  const events = mapAdminAuditEventRows(rowsResult.rows ?? [])
  const totalCount = Number(countResult.rows[0]?.total_count ?? 0)

  return {
    events,
    totalCount: Number.isFinite(totalCount) ? totalCount : 0,
  }
}

async function getAuditActors(): Promise<Array<{ id: string; label: string }>> {
  const result = await queryDb<LabelRow>(
    `select distinct
       actor.id::text as id,
       coalesce(actor.full_name, actor.email) as label
     from access_audit_events aae
     inner join admin_identities actor on actor.id = aae.actor_identity_id
     order by label asc`,
  )

  return (result.rows ?? []).flatMap((row) => row.id && row.label ? [{ id: row.id, label: row.label }] : [])
}

async function getAuditOrganisations(): Promise<AdminAuditOrganisationOption[]> {
  const result = await queryDb<LabelRow>(
    `select id::text as id, name as label
     from organisations
     order by lower(name) asc`,
  )

  return (result.rows ?? []).flatMap((row) => row.id && row.label ? [{ id: row.id, label: row.label }] : [])
}

async function getAuditEventTypes(): Promise<string[]> {
  const result = await queryDb<{ event_type: string | null }>(
    `with event_types as (
       select distinct event_type from access_audit_events
       union
       select unnest($1::text[]) as event_type
     )
     select event_type
     from event_types
     where event_type is not null and event_type <> ''
     order by event_type asc`,
    [DERIVED_EVENT_TYPES],
  )

  return (result.rows ?? []).flatMap((row) => row.event_type?.trim() ? [row.event_type.trim()] : [])
}

export async function getAdminAuditWorkspaceData(searchParams?: AuditSearchParams): Promise<AdminAuditWorkspaceData> {
  const filters = getAdminAuditFilters(searchParams)

  const [initialEvents, availableActors, availableOrganisations, availableEventTypes] = await Promise.all([
    getAdminAuditEvents(filters),
    getAuditActors(),
    getAuditOrganisations(),
    getAuditEventTypes(),
  ])

  const totalPages = Math.max(1, Math.ceil(initialEvents.totalCount / filters.pageSize))
  const page = Math.min(filters.page, totalPages)
  const resolvedEvents = page === filters.page
    ? initialEvents
    : await getAdminAuditEvents({ ...filters, page })
  const pagination = {
    page,
    pageSize: filters.pageSize,
    totalCount: resolvedEvents.totalCount,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
    windowStart: resolvedEvents.totalCount === 0 ? 0 : (page - 1) * filters.pageSize + 1,
    windowEnd: resolvedEvents.totalCount === 0 ? 0 : Math.min(resolvedEvents.totalCount, (page - 1) * filters.pageSize + resolvedEvents.events.length),
  }

  return {
    filters: {
      ...filters,
      page,
    },
    events: resolvedEvents.events,
    pagination,
    availableActors,
    availableOrganisations,
    availableEventTypes,
    appliedFilters: getAdminAuditAppliedFilters({ ...filters, page }, {
      actors: availableActors,
      organisations: availableOrganisations,
    }),
  }
}

export async function getOrganisationAuditActivity(organisationId: string, limit = 40): Promise<AdminOrganisationActivityRecord[]> {
  const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 40
  const { events } = await getAdminAuditEvents({
    ...getAdminAuditFilters({ organisationId }),
    organisationId,
    page: 1,
    pageSize: safeLimit,
  })

  return mapAuditEventsToOrganisationActivity(events)
}

