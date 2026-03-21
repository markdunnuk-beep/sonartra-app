import { describeDatabaseError, queryDb } from '@/lib/db'
import {
  getAdminAuditAppliedFilters,
  getAdminAuditEventLabel,
  getAdminAuditFilters,
  type AdminAuditEntityType,
  type AdminAuditEventRecord,
  type AdminAuditFilters,
  type AdminAuditOrganisationOption,
  type AdminAuditWorkspaceData,
  type AdminAuditWorkspaceNotice,
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

interface AuditWorkspaceSchemaCapabilities {
  hasAccessAuditEventsTable: boolean
  accessAuditEventColumns: Set<string>
}

interface AuditWorkspaceQueryDependencies {
  queryDb: typeof queryDb
}

const DERIVED_EVENT_TYPES = ['organisation_created', 'membership_invited', 'membership_joined', 'membership_inactive', 'membership_suspended']

const defaultAuditWorkspaceQueryDependencies: AuditWorkspaceQueryDependencies = {
  queryDb,
}

type TimestampInput = string | Date | null | undefined

type AuditSearchParams = Record<string, string | string[] | undefined> | undefined

function logAuditWorkspaceInvariant(message: string, details?: Record<string, unknown>) {
  console.error(`[admin-audit-workspace] ${message}`, details ?? {})
}

function unwrapErrorCause(error: unknown): unknown {
  let current = error

  while (current && typeof current === 'object' && 'cause' in current) {
    const cause = (current as { cause?: unknown }).cause

    if (!cause) {
      break
    }

    current = cause
  }

  return current
}

function extractDatabaseFailureDetails(error: unknown): { code: string | null; message: string } {
  const raw = unwrapErrorCause(error)
  const code = raw && typeof raw === 'object' && 'code' in raw && typeof (raw as { code?: unknown }).code === 'string'
    ? (raw as { code: string }).code
    : null
  const message = raw instanceof Error
    ? raw.message
    : typeof raw === 'object' && raw && 'message' in raw && typeof (raw as { message?: unknown }).message === 'string'
      ? (raw as { message: string }).message
      : error instanceof Error
        ? error.message
        : 'Unknown database error.'

  return { code, message }
}

function classifyAuditWorkspaceLoadFailure(error: unknown): AdminAuditWorkspaceNotice {
  const { code, message } = extractDatabaseFailureDetails(error)
  const normalizedMessage = message.toLowerCase()
  const missingAuditSchema = code === '42P01' || code === '42703' || [
    'access_audit_events',
    'admin_identities',
    'organisation_memberships',
    'event_summary',
    'actor_identity_id',
    'entity_type',
    'entity_id',
    'entity_label',
    'entity_secondary',
    'metadata',
  ].some((token) => normalizedMessage.includes(token.toLowerCase()))

  if (missingAuditSchema) {
    return {
      kind: 'setup_required',
      title: 'Audit workspace setup is incomplete',
      detail: 'The admin audit schema is missing or behind the current code. Apply migrations 0006_admin_access_registry.sql and 0007_assessment_admin_registry.sql, then reload this page.',
    }
  }

  return {
    kind: 'degraded',
    title: 'Audit workspace is temporarily unavailable',
    detail: 'The audit workspace query failed before evidence could be rendered. Review deployment logs and database health, then retry this view.',
  }
}

function buildEmptyAuditWorkspaceData(
  filters: AdminAuditFilters,
  notice?: AdminAuditWorkspaceNotice | null,
  lookups?: {
    actors?: Array<{ id: string; label: string }>
    organisations?: AdminAuditOrganisationOption[]
    eventTypes?: string[]
  },
): AdminAuditWorkspaceData {
  return {
    filters,
    events: [],
    pagination: {
      page: 1,
      pageSize: filters.pageSize,
      totalCount: 0,
      totalPages: 1,
      hasPreviousPage: false,
      hasNextPage: false,
      windowStart: 0,
      windowEnd: 0,
    },
    availableActors: lookups?.actors ?? [],
    availableOrganisations: lookups?.organisations ?? [],
    availableEventTypes: lookups?.eventTypes ?? DERIVED_EVENT_TYPES,
    appliedFilters: getAdminAuditAppliedFilters(filters, {
      actors: lookups?.actors ?? [],
      organisations: lookups?.organisations ?? [],
    }),
    notice: notice ?? null,
  }
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
  if (value === 'organisation' || value === 'membership' || value === 'user' || value === 'assessment' || value === 'assessment_version' || value === 'admin_access') {
    return value
  }

  if (value === 'assessment_definition') {
    return 'assessment'
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

function getAuditWorkspaceColumnExpression(
  capabilities: AuditWorkspaceSchemaCapabilities,
  columnName: string,
  fallbackSql: string,
  cast = '',
): string {
  if (!capabilities.accessAuditEventColumns.has(columnName)) {
    return fallbackSql
  }

  return `aae.${columnName}${cast}`
}

async function getAuditWorkspaceSchemaCapabilities(
  deps: AuditWorkspaceQueryDependencies,
): Promise<AuditWorkspaceSchemaCapabilities> {
  const tableResult = await deps.queryDb<{ has_access_audit_events_table: boolean | null }>(
    `select to_regclass(current_schema() || '.access_audit_events') is not null as has_access_audit_events_table`,
  )

  const hasAccessAuditEventsTable = Boolean(tableResult.rows[0]?.has_access_audit_events_table)

  if (!hasAccessAuditEventsTable) {
    return {
      hasAccessAuditEventsTable,
      accessAuditEventColumns: new Set<string>(),
    }
  }

  const columnResult = await deps.queryDb<{ column_name: string | null }>(
    `select column_name
     from information_schema.columns
     where table_schema = current_schema()
       and table_name = 'access_audit_events'`,
  )

  return {
    hasAccessAuditEventsTable,
    accessAuditEventColumns: new Set((columnResult.rows ?? []).flatMap((row) => row.column_name ? [row.column_name] : [])),
  }
}

function getAuditWorkspaceBaseQuery(capabilities: AuditWorkspaceSchemaCapabilities) {
  const entityTypeColumn = getAuditWorkspaceColumnExpression(capabilities, 'entity_type', 'null::text')
  const entityIdColumn = getAuditWorkspaceColumnExpression(capabilities, 'entity_id', 'null::text')
  const entityLabelColumn = getAuditWorkspaceColumnExpression(capabilities, 'entity_label', 'null::text')
  const entitySecondaryColumn = getAuditWorkspaceColumnExpression(capabilities, 'entity_secondary', 'null::text')

  const rawAuditEventsCte = capabilities.hasAccessAuditEventsTable
    ? `
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
        coalesce(
          nullif(${entityTypeColumn}, ''),
          case
            when aae.event_type like 'organisation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'organisation_%' then 'organisation'
            when aae.event_type like 'membership_%' or aae.event_type like 'member_%' or aae.event_type like 'invitation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'membership_%' then 'membership'
            when aae.event_type like 'assessment_%' then case when coalesce(aae.metadata ->> 'versionId', '') <> '' then 'assessment_version' else 'assessment' end
            when subject.identity_type = 'internal' and aae.organisation_id is null then 'admin_access'
            else 'user'
          end
        ) as entity_type,
        coalesce(
          nullif(${entityIdColumn}, ''),
          case
            when aae.event_type like 'organisation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'organisation_%' then aae.organisation_id::text
            when aae.event_type like 'membership_%' or aae.event_type like 'member_%' or aae.event_type like 'invitation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'membership_%' then nullif(aae.metadata ->> 'membershipId', '')
            when aae.event_type like 'assessment_%' then coalesce(nullif(aae.metadata ->> 'versionId', ''), nullif(aae.metadata ->> 'assessmentId', ''))
            else aae.identity_id::text
          end
        ) as entity_id,
        coalesce(
          nullif(${entityLabelColumn}, ''),
          case
            when aae.event_type like 'organisation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'organisation_%' then org.name
            when aae.event_type like 'assessment_%' then coalesce(nullif(aae.metadata ->> 'versionLabel', ''), nullif(aae.metadata ->> 'assessmentName', ''), nullif(aae.metadata ->> 'assessmentKey', ''))
            else coalesce(subject.full_name, subject.email, aae.identity_id::text)
          end
        ) as entity_name,
        coalesce(
          nullif(${entitySecondaryColumn}, ''),
          case
            when aae.event_type like 'organisation_%' or coalesce(aae.metadata ->> 'change_type', '') like 'organisation_%' then org.slug
            when aae.event_type like 'assessment_%' then nullif(aae.metadata ->> 'assessmentKey', '')
            else subject.email
          end
        ) as entity_secondary,
        false as is_derived
      from access_audit_events aae
      left join admin_identities actor on actor.id = aae.actor_identity_id
      left join admin_identities subject on subject.id = aae.identity_id
      left join organisations org on org.id = aae.organisation_id
    `
    : `
      select
        null::text as id,
        null::text as event_type,
        null::text as summary,
        null::text as actor_name,
        null::text as actor_id,
        null::timestamptz as happened_at,
        'audit'::text as source,
        null::text as organisation_id,
        null::text as organisation_name,
        null::text as entity_type,
        null::text as entity_id,
        null::text as entity_name,
        null::text as entity_secondary,
        false as is_derived
      where false
    `

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
      ${rawAuditEventsCte}
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

async function getAdminAuditEvents(
  filters: AdminAuditFilters,
  capabilities: AuditWorkspaceSchemaCapabilities,
  deps: AuditWorkspaceQueryDependencies,
) {
  const baseQuery = getAuditWorkspaceBaseQuery(capabilities)
  const whereClause = getAuditWorkspaceWhereClause()
  const params = getAuditWorkspaceQueryParams(filters)
  const limit = filters.pageSize
  const offset = (filters.page - 1) * filters.pageSize

  const [rowsResult, countResult] = await Promise.all([
    deps.queryDb<AdminAuditEventRow>(
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
    deps.queryDb<{ total_count: number | string | null }>(
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

async function getAuditActors(
  capabilities: AuditWorkspaceSchemaCapabilities,
  deps: AuditWorkspaceQueryDependencies,
): Promise<Array<{ id: string; label: string }>> {
  if (!capabilities.hasAccessAuditEventsTable) {
    return []
  }

  const result = await deps.queryDb<LabelRow>(
    `select distinct
       actor.id::text as id,
       coalesce(actor.full_name, actor.email) as label
     from access_audit_events aae
     inner join admin_identities actor on actor.id = aae.actor_identity_id
     order by label asc`,
  )

  return (result.rows ?? []).flatMap((row) => row.id && row.label ? [{ id: row.id, label: row.label }] : [])
}

async function getAuditOrganisations(deps: AuditWorkspaceQueryDependencies): Promise<AdminAuditOrganisationOption[]> {
  const result = await deps.queryDb<LabelRow>(
    `select id::text as id, name as label
     from organisations
     order by lower(name) asc`,
  )

  return (result.rows ?? []).flatMap((row) => row.id && row.label ? [{ id: row.id, label: row.label }] : [])
}

async function getAuditEventTypes(
  capabilities: AuditWorkspaceSchemaCapabilities,
  deps: AuditWorkspaceQueryDependencies,
): Promise<string[]> {
  if (!capabilities.hasAccessAuditEventsTable) {
    return [...DERIVED_EVENT_TYPES]
  }

  const result = await deps.queryDb<{ event_type: string | null }>(
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

export async function getAdminAuditWorkspaceData(
  searchParams?: AuditSearchParams,
  deps: AuditWorkspaceQueryDependencies = defaultAuditWorkspaceQueryDependencies,
): Promise<AdminAuditWorkspaceData> {
  const filters = getAdminAuditFilters(searchParams)

  try {
    const capabilities = await getAuditWorkspaceSchemaCapabilities(deps)
    const [initialEvents, availableActors, availableOrganisations, availableEventTypes] = await Promise.all([
      getAdminAuditEvents(filters, capabilities, deps),
      getAuditActors(capabilities, deps),
      getAuditOrganisations(deps),
      getAuditEventTypes(capabilities, deps),
    ])

    const totalPages = Math.max(1, Math.ceil(initialEvents.totalCount / filters.pageSize))
    const page = Math.min(filters.page, totalPages)
    const resolvedEvents = page === filters.page
      ? initialEvents
      : await getAdminAuditEvents({ ...filters, page }, capabilities, deps)
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
      notice: null,
    }
  } catch (error) {
    const notice = classifyAuditWorkspaceLoadFailure(error)
    console.error('Admin audit workspace load failed:', notice.title, describeDatabaseError(error))
    return buildEmptyAuditWorkspaceData(filters, notice)
  }
}

export async function getScopedAdminAuditActivity({
  entityType,
  entityId,
  includeSecondaryEntityType,
  limit = 40,
}: {
  entityType: AdminAuditEntityType
  entityId: string
  includeSecondaryEntityType?: AdminAuditEntityType
  limit?: number
}): Promise<AdminAuditEventRecord[]> {
  try {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 40
    const capabilities = await getAuditWorkspaceSchemaCapabilities(defaultAuditWorkspaceQueryDependencies)
    const baseFilters = {
      ...getAdminAuditFilters({ entityType, entityId }),
      entityType,
      entityId,
      page: 1,
      pageSize: safeLimit,
    }

    const primaryEvents = await getAdminAuditEvents(baseFilters, capabilities, defaultAuditWorkspaceQueryDependencies)

    if (!includeSecondaryEntityType) {
      return primaryEvents.events
    }

    const secondaryEvents = await getAdminAuditEvents({
      ...getAdminAuditFilters({ entityType: includeSecondaryEntityType, entityId }),
      entityType: includeSecondaryEntityType,
      entityId,
      page: 1,
      pageSize: safeLimit,
    }, capabilities, defaultAuditWorkspaceQueryDependencies)

    return [...primaryEvents.events, ...secondaryEvents.events]
      .sort((left, right) => right.happenedAt.localeCompare(left.happenedAt) || right.id.localeCompare(left.id))
      .slice(0, safeLimit)
  } catch (error) {
    console.error('Admin scoped audit activity load failed:', describeDatabaseError(error))
    return []
  }
}

export function mapScopedAuditEventsToAssessmentActivity(events: AdminAuditEventRecord[]): Array<{
  id: string
  eventType: string
  summary: string
  actorId: string | null
  actorName: string | null
  happenedAt: string
  source: 'audit' | 'membership' | 'organisation'
  entityType: 'assessment' | 'assessment_version'
  entityId: string | null
  entityName: string | null
  entitySecondary: string | null
}> {
  return events
    .filter((event) => event.entityType === 'assessment' || event.entityType === 'assessment_version')
    .map((event) => ({
      id: event.id,
      eventType: event.eventType,
      summary: event.summary,
      actorId: event.actorId,
      actorName: event.actorName,
      happenedAt: event.happenedAt,
      source: event.source,
      entityType: event.entityType as 'assessment' | 'assessment_version',
      entityId: event.entityId,
      entityName: event.entityName,
      entitySecondary: event.entitySecondary,
    }))
}

export async function getOrganisationAuditActivity(organisationId: string, limit = 40): Promise<AdminOrganisationActivityRecord[]> {
  try {
    const safeLimit = Number.isFinite(limit) && limit > 0 ? Math.min(limit, 100) : 40
    const capabilities = await getAuditWorkspaceSchemaCapabilities(defaultAuditWorkspaceQueryDependencies)
    const { events } = await getAdminAuditEvents({
      ...getAdminAuditFilters({ organisationId }),
      organisationId,
      page: 1,
      pageSize: safeLimit,
    }, capabilities, defaultAuditWorkspaceQueryDependencies)

    return mapAuditEventsToOrganisationActivity(events)
  } catch (error) {
    console.error('Admin organisation audit activity load failed:', describeDatabaseError(error))
    return []
  }
}
