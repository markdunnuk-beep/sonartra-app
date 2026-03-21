import { queryDb } from '@/lib/db'
import type {
  AdminOrganisationActivityRecord,
  AdminOrganisationAssessmentRecord,
  AdminOrganisationDetailData,
  AdminOrganisationMemberRecord,
} from '@/lib/admin/domain/organisation-detail'

interface OrganisationSummaryRow {
  id: string | null
  name: string | null
  slug: string | null
  status: string | null
  country: string | null
  plan_tier: string | null
  seat_band: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
  total_members: number | string | null
  active_members: number | string | null
  invited_members: number | string | null
  inactive_members: number | string | null
  assigned_assessments: number | string | null
  assessment_catalog_count: number | string | null
  completed_assessments: number | string | null
  last_membership_activity_at: string | Date | null
  last_assessment_activity_at: string | Date | null
  last_audit_activity_at: string | Date | null
  last_operational_activity_at: string | Date | null
}

interface OrganisationMemberRow {
  identity_id: string | null
  full_name: string | null
  email: string | null
  role: string | null
  access_status: string | null
  joined_at: string | Date | null
  invited_at: string | Date | null
  last_activity_at: string | Date | null
}

interface OrganisationAssessmentRow {
  assessment_version_id: string | null
  title: string | null
  library_key: string | null
  publish_state: boolean | null
  assigned_users_count: number | string | null
  completion_count: number | string | null
  updated_at: string | Date | null
}

interface OrganisationActivityRow {
  id: string | null
  event_type: string | null
  summary: string | null
  actor_name: string | null
  happened_at: string | Date | null
  source: 'audit' | 'membership' | 'organisation' | null
}

type TimestampInput = string | Date | null | undefined

function logOrganisationDetailInvariant(message: string, details?: Record<string, unknown>) {
  console.error(`[admin-organisation-detail] ${message}`, details ?? {})
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
    logOrganisationDetailInvariant(`Missing required ${fieldName} while assembling organisation detail data.`, details)
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

  logOrganisationDetailInvariant(`Missing or invalid ${fieldName} while assembling organisation detail data.`, details)
  return 0
}

export function mapOrganisationSummaryRow(row: OrganisationSummaryRow): AdminOrganisationDetailData['organisation'] | null {
  const id = normaliseRequiredString(row.id, 'organisation.id', { row })
  const name = normaliseRequiredString(row.name, 'organisation.name', { row })
  const slug = normaliseRequiredString(row.slug, 'organisation.slug', { row })
  const status = normaliseRequiredString(row.status, 'organisation.status', { row })
  const createdAt = normaliseTimestamp(row.created_at)
  const updatedAt = normaliseTimestamp(row.updated_at)

  if (!id || !name || !slug || !status || !createdAt || !updatedAt) {
    if (!createdAt || !updatedAt) {
      logOrganisationDetailInvariant('Missing or invalid organisation timestamps while assembling organisation detail data.', { row })
    }

    return null
  }

  return {
    id,
    name,
    slug,
    status,
    country: normaliseOptionalString(row.country),
    planTier: normaliseOptionalString(row.plan_tier),
    seatBand: normaliseOptionalString(row.seat_band),
    classification: null,
    createdAt,
    updatedAt,
    totalMembers: normaliseCount(row.total_members, 'organisation.total_members', { organisationId: id }),
    activeMembers: normaliseCount(row.active_members, 'organisation.active_members', { organisationId: id }),
    invitedMembers: normaliseCount(row.invited_members, 'organisation.invited_members', { organisationId: id }),
    inactiveMembers: normaliseCount(row.inactive_members, 'organisation.inactive_members', { organisationId: id }),
    assignedAssessments: normaliseCount(row.assigned_assessments, 'organisation.assigned_assessments', { organisationId: id }),
    assessmentCatalogCount: normaliseCount(row.assessment_catalog_count, 'organisation.assessment_catalog_count', { organisationId: id }),
    completedAssessments: normaliseCount(row.completed_assessments, 'organisation.completed_assessments', { organisationId: id }),
    lastMembershipActivityAt: normaliseTimestamp(row.last_membership_activity_at),
    lastAssessmentActivityAt: normaliseTimestamp(row.last_assessment_activity_at),
    lastAuditActivityAt: normaliseTimestamp(row.last_audit_activity_at),
    lastOperationalActivityAt: normaliseTimestamp(row.last_operational_activity_at) ?? updatedAt,
  }
}

export function mapOrganisationMemberRows(rows: OrganisationMemberRow[]): AdminOrganisationMemberRecord[] {
  return (rows ?? []).flatMap((row) => {
    const identityId = normaliseRequiredString(row.identity_id, 'member.identity_id', { row })
    const fullName = normaliseRequiredString(row.full_name, 'member.full_name', { row })
    const email = normaliseRequiredString(row.email, 'member.email', { row })
    const role = normaliseRequiredString(row.role, 'member.role', { row })
    const accessStatus = normaliseRequiredString(row.access_status, 'member.access_status', { row })

    if (!identityId || !fullName || !email || !role || !accessStatus) {
      return []
    }

    return [{
      identityId,
      fullName,
      email,
      role,
      accessStatus,
      joinedAt: normaliseTimestamp(row.joined_at),
      invitedAt: normaliseTimestamp(row.invited_at),
      lastActivityAt: normaliseTimestamp(row.last_activity_at),
    }]
  })
}

export function mapOrganisationAssessmentRows(rows: OrganisationAssessmentRow[]): AdminOrganisationAssessmentRecord[] {
  return (rows ?? []).flatMap((row) => {
    const assessmentVersionId = normaliseRequiredString(row.assessment_version_id, 'assessment.assessment_version_id', { row })
    const title = normaliseRequiredString(row.title, 'assessment.title', { row })
    const libraryKey = normaliseRequiredString(row.library_key, 'assessment.library_key', { row })

    if (!assessmentVersionId || !title || !libraryKey) {
      return []
    }

    return [{
      assessmentVersionId,
      title,
      libraryKey,
      publishState: row.publish_state ? 'published' : 'unpublished',
      assignedUsersCount: normaliseCount(row.assigned_users_count, 'assessment.assigned_users_count', { assessmentVersionId }),
      completionCount: normaliseCount(row.completion_count, 'assessment.completion_count', { assessmentVersionId }),
      updatedAt: normaliseTimestamp(row.updated_at),
    }]
  })
}

export function mapOrganisationActivityRows(rows: OrganisationActivityRow[]): AdminOrganisationActivityRecord[] {
  return (rows ?? []).flatMap((row) => {
    const id = normaliseRequiredString(row.id, 'activity.id', { row })
    const eventType = normaliseRequiredString(row.event_type, 'activity.event_type', { row })
    const summary = normaliseRequiredString(row.summary, 'activity.summary', { row })
    const happenedAt = normaliseTimestamp(row.happened_at)

    if (!id || !eventType || !summary || !happenedAt) {
      if (!happenedAt) {
        logOrganisationDetailInvariant('Missing or invalid activity.happened_at while assembling organisation detail data.', { row })
      }

      return []
    }

    return [{
      id,
      eventType,
      summary,
      actorName: normaliseOptionalString(row.actor_name),
      happenedAt,
      source: row.source ?? 'audit',
    }]
  })
}

async function getOrganisationScopedActivity(organisationId: string): Promise<AdminOrganisationActivityRecord[]> {
  const activityResult = await queryDb<OrganisationActivityRow>(
    `with organisation_events as (
       select
         concat('organisation-created-', o.id::text) as id,
         'organisation_created' as event_type,
         'Organisation record created.' as summary,
         null::text as actor_name,
         o.created_at as happened_at,
         'organisation'::text as source
       from organisations o
       where o.id = $1
     ),
     membership_events as (
       -- Derived membership rows fill truthful gaps until all organisation events are written directly into access_audit_events.
       select
         concat('membership-', om.id::text, '-invited') as id,
         'membership_invited' as event_type,
         concat(ai.full_name, ' invited with ', om.membership_role, ' access.') as summary,
         null::text as actor_name,
         om.invited_at as happened_at,
         'membership'::text as source
       from organisation_memberships om
       inner join admin_identities ai on ai.id = om.identity_id
       where om.organisation_id = $1 and om.invited_at is not null

       union all

       select
         concat('membership-', om.id::text, '-joined') as id,
         'membership_joined' as event_type,
         concat(ai.full_name, ' joined with ', om.membership_role, ' access.') as summary,
         null::text as actor_name,
         om.joined_at as happened_at,
         'membership'::text as source
       from organisation_memberships om
       inner join admin_identities ai on ai.id = om.identity_id
       where om.organisation_id = $1 and om.joined_at is not null

       union all

       select
         concat('membership-', om.id::text, '-state') as id,
         concat('membership_', om.membership_status) as event_type,
         concat(ai.full_name, ' membership currently marked ', om.membership_status, '.') as summary,
         null::text as actor_name,
         coalesce(om.last_activity_at, om.joined_at, om.invited_at) as happened_at,
         'membership'::text as source
       from organisation_memberships om
       inner join admin_identities ai on ai.id = om.identity_id
       where om.organisation_id = $1 and om.membership_status in ('inactive', 'suspended')
     ),
     audit_events as (
       select
         id::text,
         event_type,
         event_summary as summary,
         actor_name,
         happened_at,
         'audit'::text as source
       from access_audit_events
       where organisation_id = $1
     )
     select id, event_type, summary, actor_name, happened_at, source
     from (
       select * from organisation_events
       union all
       select * from membership_events
       union all
       select * from audit_events
     ) scoped_activity
     where happened_at is not null
     order by happened_at desc, id desc
     limit 40`,
    [organisationId],
  )

  return mapOrganisationActivityRows(activityResult.rows ?? [])
}

export async function getAdminOrganisationDetailData(organisationId: string): Promise<AdminOrganisationDetailData | null> {
  const summaryResult = await queryDb<OrganisationSummaryRow>(`
    with membership_stats as (
      select
        organisation_id,
        count(*)::int as total_members,
        count(*) filter (where membership_status = 'active')::int as active_members,
        count(*) filter (where membership_status = 'invited')::int as invited_members,
        count(*) filter (where membership_status in ('inactive', 'suspended'))::int as inactive_members,
        max(last_activity_at) as last_membership_activity_at
      from organisation_memberships
      group by organisation_id
    ),
    assessment_stats as (
      select
        organisation_id,
        count(*)::int as assigned_assessments,
        count(distinct assessment_version_id)::int as assessment_catalog_count,
        count(*) filter (where status = 'completed')::int as completed_assessments,
        max(updated_at) as last_assessment_activity_at
      from assessments
      where organisation_id is not null
      group by organisation_id
    ),
    audit_stats as (
      select organisation_id, max(happened_at) as last_audit_activity_at
      from access_audit_events
      where organisation_id is not null
      group by organisation_id
    )
    select
      o.id,
      o.name,
      o.slug,
      o.status,
      o.country,
      o.plan_tier,
      o.seat_band,
      o.created_at,
      o.updated_at,
      coalesce(ms.total_members, 0) as total_members,
      coalesce(ms.active_members, 0) as active_members,
      coalesce(ms.invited_members, 0) as invited_members,
      coalesce(ms.inactive_members, 0) as inactive_members,
      coalesce(ass.assigned_assessments, 0) as assigned_assessments,
      coalesce(ass.assessment_catalog_count, 0) as assessment_catalog_count,
      coalesce(ass.completed_assessments, 0) as completed_assessments,
      ms.last_membership_activity_at,
      ass.last_assessment_activity_at,
      audit.last_audit_activity_at,
      greatest(
        coalesce(ms.last_membership_activity_at, o.updated_at),
        coalesce(ass.last_assessment_activity_at, o.updated_at),
        coalesce(audit.last_audit_activity_at, o.updated_at),
        o.updated_at
      ) as last_operational_activity_at
    from organisations o
    left join membership_stats ms on ms.organisation_id = o.id
    left join assessment_stats ass on ass.organisation_id = o.id
    left join audit_stats audit on audit.organisation_id = o.id
    where o.id = $1
    limit 1
  `, [organisationId])

  const summaryRow = summaryResult.rows[0]

  if (!summaryRow) {
    return null
  }

  const organisation = mapOrganisationSummaryRow(summaryRow)

  if (!organisation) {
    return null
  }

  const [membersResult, assessmentsResult, auditTrail] = await Promise.all([
    queryDb<OrganisationMemberRow>(`
      select
        om.identity_id,
        ai.full_name,
        ai.email,
        om.membership_role as role,
        om.membership_status as access_status,
        om.joined_at,
        om.invited_at,
        coalesce(om.last_activity_at, ai.last_activity_at) as last_activity_at
      from organisation_memberships om
      inner join admin_identities ai on ai.id = om.identity_id
      where om.organisation_id = $1
      order by lower(ai.full_name) asc, lower(ai.email) asc
    `, [organisationId]),
    queryDb<OrganisationAssessmentRow>(`
      select
        av.id as assessment_version_id,
        av.name as title,
        av.key as library_key,
        av.is_active as publish_state,
        count(distinct a.user_id)::int as assigned_users_count,
        count(*) filter (where a.status = 'completed')::int as completion_count,
        max(a.updated_at) as updated_at
      from assessments a
      inner join assessment_versions av on av.id = a.assessment_version_id
      where a.organisation_id = $1
      group by av.id, av.name, av.key, av.is_active
      order by max(a.updated_at) desc nulls last, lower(av.name) asc
    `, [organisationId]),
    getOrganisationScopedActivity(organisationId),
  ])

  return {
    organisation,
    members: mapOrganisationMemberRows(membersResult.rows ?? []),
    assessments: mapOrganisationAssessmentRows(assessmentsResult.rows ?? []),
    recentActivity: auditTrail.slice(0, 6),
    auditTrail,
  }
}
