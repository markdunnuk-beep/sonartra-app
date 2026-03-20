import type { QueryResultRow } from 'pg'

import { queryDb, withTransaction } from '../lib/db'
import {
  buildAdminAccessRegistryBootstrapPlan,
  buildExistingIdentityMap,
  buildExistingMembershipMap,
  buildExistingRoleAssignmentMap,
  parseAdminEmailAllowlist,
  type AdminIdentityRoleUpsertRecord,
  type AdminIdentityUpsertRecord,
  type ExistingAdminIdentityRecord,
  type ExistingAdminIdentityRoleRecord,
  type ExistingOrganisationMembershipRecord,
  type LegacyOrganisationMembershipRecord,
  type LegacyUserRecord,
  type OrganisationMembershipUpsertRecord,
} from '../lib/admin/server/access-registry-bootstrap'

interface QueryExecutor {
  query<T extends QueryResultRow = QueryResultRow>(text: string, params?: unknown[]): Promise<{ rows: T[] }>
}

interface LegacyUserQueryRow {
  id: string
  email: string | null
  first_name: string | null
  last_name: string | null
  account_type: string | null
  external_auth_id: string | null
  created_at: string | Date | null
  updated_at: string | Date | null
  last_assessment_activity_at: string | Date | null
}

interface LegacyMembershipQueryRow {
  id: string
  user_id: string
  organisation_id: string
  role: string | null
  member_status: string | null
  joined_at: string | Date | null
  created_at: string | Date | null
  updated_at: string | Date | null
  last_activity_at: string | Date | null
}

interface ExistingIdentityQueryRow extends ExistingAdminIdentityRecord {}

interface ExistingMembershipQueryRow extends ExistingOrganisationMembershipRecord {}

interface ExistingRoleQueryRow {
  identity_id: string
  role_key: string
  organisation_id: string | null
  assigned_at: string
}

interface RoleIdQueryRow {
  id: string
  key: string
}

function parseFlags(argv: string[]) {
  const flags = new Set(argv)
  return {
    dryRun: !flags.has('--apply'),
    json: flags.has('--json'),
    help: flags.has('--help') || flags.has('-h'),
  }
}

function printHelp() {
  console.log([
    'Bootstrap Sonartra admin access registry from legacy production tables.',
    '',
    'Usage:',
    '  npx tsx scripts/bootstrap-admin-access-registry.ts --dry-run',
    '  npx tsx scripts/bootstrap-admin-access-registry.ts --apply',
    '',
    'Flags:',
    '  --dry-run   Plan only (default). Reports counts without writing.',
    '  --apply     Execute idempotent upserts into admin_identities, organisation_memberships, and admin_identity_roles.',
    '  --json      Emit the operational report as JSON.',
    '  --help      Show this help text.',
  ].join('\n'))
}

async function loadLegacyUsers(): Promise<LegacyUserRecord[]> {
  const result = await queryDb<LegacyUserQueryRow>(`
    select
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.account_type,
      u.external_auth_id,
      u.created_at,
      u.updated_at,
      max(coalesce(a.last_activity_at, a.completed_at, a.started_at, a.updated_at, a.created_at)) as last_assessment_activity_at
    from users u
    left join assessments a on a.user_id = u.id
    group by
      u.id,
      u.email,
      u.first_name,
      u.last_name,
      u.account_type,
      u.external_auth_id,
      u.created_at,
      u.updated_at
    order by u.created_at asc, u.id asc
  `)

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    firstName: row.first_name,
    lastName: row.last_name,
    accountType: row.account_type,
    externalAuthId: row.external_auth_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastAssessmentActivityAt: row.last_assessment_activity_at,
  }))
}

async function loadLegacyMemberships(): Promise<LegacyOrganisationMembershipRecord[]> {
  const result = await queryDb<LegacyMembershipQueryRow>(`
    select
      om.id,
      om.user_id,
      om.organisation_id,
      om.role,
      om.member_status,
      om.joined_at,
      om.created_at,
      om.updated_at,
      max(coalesce(a.last_activity_at, a.completed_at, a.started_at, a.updated_at, a.created_at)) as last_activity_at
    from organisation_members om
    left join assessments a
      on a.user_id = om.user_id
     and a.organisation_id = om.organisation_id
    group by
      om.id,
      om.user_id,
      om.organisation_id,
      om.role,
      om.member_status,
      om.joined_at,
      om.created_at,
      om.updated_at
    order by om.created_at asc, om.id asc
  `)

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    organisationId: row.organisation_id,
    role: row.role,
    memberStatus: row.member_status,
    joinedAt: row.joined_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    lastActivityAt: row.last_activity_at,
  }))
}

async function loadExistingIdentities(): Promise<ExistingAdminIdentityRecord[]> {
  const result = await queryDb<ExistingIdentityQueryRow>(`
    select
      id,
      email,
      full_name as "fullName",
      identity_type as "identityType",
      auth_provider as "authProvider",
      auth_subject as "authSubject",
      status,
      last_activity_at as "lastActivityAt",
      created_at as "createdAt"
    from admin_identities
  `)

  return result.rows
}

async function loadExistingMemberships(): Promise<ExistingOrganisationMembershipRecord[]> {
  const result = await queryDb<ExistingMembershipQueryRow>(`
    select
      identity_id as "identityId",
      organisation_id as "organisationId",
      membership_role as "membershipRole",
      membership_status as "membershipStatus",
      joined_at as "joinedAt",
      invited_at as "invitedAt",
      last_activity_at as "lastActivityAt"
    from organisation_memberships
  `)

  return result.rows
}

async function loadExistingRoleAssignments(): Promise<ExistingAdminIdentityRoleRecord[]> {
  const result = await queryDb<ExistingRoleQueryRow>(`
    select
      air.identity_id,
      ar.key as role_key,
      air.organisation_id,
      air.assigned_at
    from admin_identity_roles air
    inner join admin_roles ar on ar.id = air.role_id
  `)

  return result.rows.map((row) => ({
    identityId: row.identity_id,
    roleKey: row.role_key,
    organisationId: row.organisation_id,
    assignedAt: row.assigned_at,
  }))
}

async function loadRoleIdsByKey(): Promise<Map<string, string>> {
  const result = await queryDb<RoleIdQueryRow>('select id, key from admin_roles')
  return new Map(result.rows.map((row) => [row.key, row.id]))
}

async function upsertIdentities(executor: QueryExecutor, records: AdminIdentityUpsertRecord[]) {
  for (const record of records) {
    await executor.query(
      `
        insert into admin_identities (
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
        values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        on conflict (id)
        do update set
          email = excluded.email,
          full_name = excluded.full_name,
          identity_type = excluded.identity_type,
          auth_provider = excluded.auth_provider,
          auth_subject = excluded.auth_subject,
          status = excluded.status,
          last_activity_at = excluded.last_activity_at,
          created_at = excluded.created_at
      `,
      [
        record.id,
        record.email,
        record.fullName,
        record.identityType,
        record.authProvider,
        record.authSubject,
        record.status,
        record.lastActivityAt,
        record.createdAt,
      ],
    )
  }
}

async function upsertMemberships(executor: QueryExecutor, records: OrganisationMembershipUpsertRecord[]) {
  for (const record of records) {
    await executor.query(
      `
        insert into organisation_memberships (
          identity_id,
          organisation_id,
          membership_role,
          membership_status,
          joined_at,
          invited_at,
          last_activity_at
        )
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (identity_id, organisation_id)
        do update set
          membership_role = excluded.membership_role,
          membership_status = excluded.membership_status,
          joined_at = excluded.joined_at,
          invited_at = excluded.invited_at,
          last_activity_at = excluded.last_activity_at
      `,
      [
        record.identityId,
        record.organisationId,
        record.membershipRole,
        record.membershipStatus,
        record.joinedAt,
        record.invitedAt,
        record.lastActivityAt,
      ],
    )
  }
}

async function upsertRoleAssignments(executor: QueryExecutor, records: AdminIdentityRoleUpsertRecord[], roleIdsByKey: Map<string, string>) {
  for (const record of records) {
    const roleId = roleIdsByKey.get(record.roleKey)

    if (!roleId) {
      throw new Error(`Missing admin_roles row for key=${record.roleKey}`)
    }

    if (record.organisationId) {
      await executor.query(
        `
          insert into admin_identity_roles (
            identity_id,
            role_id,
            organisation_id,
            assigned_at
          )
          values ($1, $2, $3, $4)
          on conflict (identity_id, role_id, organisation_id)
          where organisation_id is not null
          do update set
            assigned_at = excluded.assigned_at
        `,
        [record.identityId, roleId, record.organisationId, record.assignedAt],
      )
      continue
    }

    await executor.query(
      `
        insert into admin_identity_roles (
          identity_id,
          role_id,
          organisation_id,
          assigned_at
        )
        values ($1, $2, null, $3)
        on conflict (identity_id, role_id)
        where organisation_id is null
        do update set
          assigned_at = excluded.assigned_at
      `,
      [record.identityId, roleId, record.assignedAt],
    )
  }
}

function buildReport(plan: ReturnType<typeof buildAdminAccessRegistryBootstrapPlan>, isDryRun: boolean) {
  return {
    mode: isDryRun ? 'dry_run' : 'apply',
    mappingPlan: plan.mappingPlan,
    counters: plan.counters,
    ambiguousIdentityExamples: plan.ambiguities.slice(0, 10),
  }
}

async function main() {
  const flags = parseFlags(process.argv.slice(2))

  if (flags.help) {
    printHelp()
    return
  }

  const [users, memberships, existingIdentities, existingMemberships, existingRoles] = await Promise.all([
    loadLegacyUsers(),
    loadLegacyMemberships(),
    loadExistingIdentities(),
    loadExistingMemberships(),
    loadExistingRoleAssignments(),
  ])

  const plan = buildAdminAccessRegistryBootstrapPlan({
    users,
    memberships,
    config: {
      internalAdminEmails: parseAdminEmailAllowlist(process.env.SONARTRA_ADMIN_EMAILS),
    },
    existing: {
      identitiesById: buildExistingIdentityMap(existingIdentities),
      membershipsByCompositeKey: buildExistingMembershipMap(existingMemberships),
      roleAssignmentsByCompositeKey: buildExistingRoleAssignmentMap(existingRoles),
    },
  })

  if (flags.json) {
    console.log(JSON.stringify(buildReport(plan, flags.dryRun), null, 2))
  } else {
    console.log(`admin-access-registry bootstrap mode: ${flags.dryRun ? 'dry-run' : 'apply'}`)
    console.log('')
    plan.mappingPlan.forEach((line) => console.log(line))
    console.log('')
    Object.entries(plan.counters).forEach(([key, value]) => console.log(`${key}: ${value}`))

    if (plan.ambiguities.length > 0) {
      console.log('')
      console.log('Ambiguous identity classifications (first 10):')
      plan.ambiguities.slice(0, 10).forEach((entry) => console.log(`- ${entry.userId} ${entry.email ?? '(missing email)'} :: ${entry.reason}`))
    }
  }

  if (flags.dryRun) {
    return
  }

  const roleIdsByKey = await loadRoleIdsByKey()

  await withTransaction(async (client) => {
    const executor: QueryExecutor = {
      query: (text, params) => client.query(text, params),
    }

    await upsertIdentities(executor, plan.identities)
    await upsertMemberships(executor, plan.memberships)
    await upsertRoleAssignments(executor, plan.roleAssignments, roleIdsByKey)
  })
}

main().catch((error) => {
  console.error('[bootstrap-admin-access-registry] Failed.', error)
  process.exitCode = 1
})
