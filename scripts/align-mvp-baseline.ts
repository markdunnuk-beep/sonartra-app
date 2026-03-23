import type { QueryResultRow } from 'pg'

import { queryDb, withTransaction } from '../lib/db'
import {
  APPLY_CONFIRMATION_TOKEN,
  buildAlignmentOperations,
  buildBackupGuidance,
  buildManualSqlPlan,
  DATA_ALIGNMENT_TABLES,
  DEFAULT_PRESERVED_ASSESSMENT_VERSION_KEYS,
  fetchForeignKeyDependencyMap,
  getTablesByCategory,
  type AssessmentShellContext,
  type BuildAlignmentOperationsInput,
  type ResolvedOwnerContext,
  validateApplySafety,
} from '../lib/server/data-alignment'

interface ExistingTableRow {
  table_name: string
}

interface CountRow {
  count: string | number
}

interface SampleRow extends QueryResultRow {
  id?: string
}

interface OwnerUserRow {
  id: string
  email: string | null
  external_auth_id: string | null
}

interface AdminIdentityRow {
  id: string
  email: string | null
  auth_subject: string | null
}

interface PreservedVersionRow {
  id: string
  key: string
  assessment_definition_id: string | null
}

interface ParsedFlags {
  audit: boolean
  apply: boolean
  json: boolean
  help: boolean
  allowEmptyUsers: boolean
  confirmationToken: string | null
  ownerUserId: string | null
  ownerEmail: string | null
  ownerExternalAuthId: string | null
  preserveOrganisationIds: string[]
  preserveAssessmentVersionKeys: string[]
  clearAssessmentShells: boolean
}

function parseListFlag(value: string | null): string[] {
  if (!value) {
    return []
  }

  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function parseFlags(argv: string[]): ParsedFlags {
  const flagMap = new Map<string, string[]>()

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index]
    if (!token.startsWith('--')) {
      continue
    }

    const [rawKey, inlineValue] = token.split('=', 2)
    if (inlineValue !== undefined) {
      flagMap.set(rawKey, [...(flagMap.get(rawKey) ?? []), inlineValue])
      continue
    }

    const next = argv[index + 1]
    if (next && !next.startsWith('--')) {
      flagMap.set(rawKey, [...(flagMap.get(rawKey) ?? []), next])
      index += 1
      continue
    }

    flagMap.set(rawKey, [...(flagMap.get(rawKey) ?? []), 'true'])
  }

  const apply = flagMap.has('--apply')
  const preserveAssessmentVersionKeys = parseListFlag(flagMap.get('--preserve-assessment-version-keys')?.at(-1) ?? null)
  const clearAssessmentShells = flagMap.has('--clear-assessment-shells')

  return {
    audit: !apply,
    apply,
    json: flagMap.has('--json'),
    help: flagMap.has('--help') || flagMap.has('-h'),
    allowEmptyUsers: flagMap.has('--allow-empty-users'),
    confirmationToken: flagMap.get('--confirm')?.at(-1) ?? null,
    ownerUserId: flagMap.get('--owner-user-id')?.at(-1) ?? null,
    ownerEmail: flagMap.get('--owner-email')?.at(-1)?.toLowerCase() ?? null,
    ownerExternalAuthId: flagMap.get('--owner-external-auth-id')?.at(-1) ?? null,
    preserveOrganisationIds: parseListFlag(flagMap.get('--preserve-organisation-ids')?.at(-1) ?? null),
    preserveAssessmentVersionKeys: clearAssessmentShells
      ? []
      : preserveAssessmentVersionKeys.length
        ? preserveAssessmentVersionKeys
        : [...DEFAULT_PRESERVED_ASSESSMENT_VERSION_KEYS],
    clearAssessmentShells,
  }
}

function printHelp() {
  console.log([
    'Audit or align Sonartra live app/admin data back to a clean MVP baseline without changing schema.',
    '',
    'Default mode is read-only audit.',
    '',
    'Usage:',
    '  npx tsx scripts/align-mvp-baseline.ts',
    '  npx tsx scripts/align-mvp-baseline.ts --owner-email owner@example.com --json',
    `  npx tsx scripts/align-mvp-baseline.ts --apply --confirm ${APPLY_CONFIRMATION_TOKEN} --owner-email owner@example.com`,
    '',
    'Important safety rules:',
    '  - This tool never touches schema_migrations or alters schema.',
    '  - Run and review dry-run output first.',
    '  - Export backups before any --apply execution.',
    '  - --apply requires the exact confirmation token and, by default, a resolved owner user.',
    '',
    'Flags:',
    '  --apply                               Execute the data-alignment transaction.',
    '  --confirm <token>                     Required for --apply. Use ALIGN_MVP_BASELINE.',
    '  --owner-email <email>                 Preserve the owner app user/admin identity by email when possible.',
    '  --owner-user-id <uuid>                Preserve the owner app user by users.id.',
    '  --owner-external-auth-id <subject>    Preserve the owner app user via users.external_auth_id / admin auth_subject.',
    '  --preserve-organisation-ids <ids>     Optional comma-separated organisation UUIDs to keep.',
    '  --preserve-assessment-version-keys <keys> Optional comma-separated assessment version keys to keep as scrubbed baseline shells.',
    '  --clear-assessment-shells             Delete all assessment definitions/versions instead of preserving the repo baseline shell.',
    '  --allow-empty-users                   Allow deleting every users row (not recommended).',
    '  --json                                Emit JSON report.',
    '  --help                                Show help.',
  ].join('\n'))
}

async function loadExistingTables() {
  const result = await queryDb<ExistingTableRow>(
    `select table_name
     from information_schema.tables
     where table_schema = current_schema()`
  )

  return new Set(result.rows.map((row) => row.table_name))
}

async function loadTableCount(tableName: string): Promise<number> {
  const result = await queryDb<CountRow>(`select count(*)::int as count from ${tableName}`)
  const raw = result.rows[0]?.count ?? 0
  return typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
}

async function loadTableSamples(tableName: string): Promise<QueryResultRow[]> {
  const sampleSqlByTable: Record<string, string> = {
    users: 'select id, email, external_auth_id from users order by created_at asc nulls last, id asc limit 5',
    organisations: 'select id, name, slug, status from organisations order by created_at asc nulls last, id asc limit 5',
    organisation_members: 'select id, organisation_id, user_id, role, member_status from organisation_members order by created_at asc nulls last, id asc limit 5',
    admin_identities: 'select id, email, identity_type, auth_subject, status from admin_identities order by created_at asc nulls last, id asc limit 5',
    admin_identity_roles: 'select id, identity_id, organisation_id, role_id from admin_identity_roles order by assigned_at asc nulls last, id asc limit 5',
    organisation_memberships: 'select id, identity_id, organisation_id, membership_role, membership_status from organisation_memberships order by invited_at asc nulls last, joined_at asc nulls last, id asc limit 5',
    access_audit_events: 'select id, identity_id, organisation_id, event_type, happened_at from access_audit_events order by happened_at desc nulls last, id asc limit 5',
    assessments: 'select id, user_id, organisation_id, assessment_version_id, status from assessments order by created_at asc nulls last, id asc limit 5',
    assessment_responses: 'select id, assessment_id, question_id, response_value from assessment_responses order by created_at asc nulls last, id asc limit 5',
    assessment_score_snapshots: 'select id, assessment_id, scoring_version from assessment_score_snapshots order by created_at asc nulls last, id asc limit 5',
    assessment_results: 'select id, assessment_id, assessment_version_id, status from assessment_results order by created_at asc nulls last, id asc limit 5',
    assessment_result_signals: 'select id, assessment_result_id, layer_key, signal_key from assessment_result_signals order by created_at asc nulls last, id asc limit 5',
    assessment_definitions: 'select id, key, slug, lifecycle_status, current_published_version_id from assessment_definitions order by created_at asc nulls last, id asc limit 5',
    assessment_versions: 'select id, key, assessment_definition_id, lifecycle_status, package_status from assessment_versions order by created_at asc nulls last, id asc limit 5',
    assessment_question_sets: 'select id, assessment_version_id, key, is_active from assessment_question_sets order by created_at asc nulls last, id asc limit 5',
    assessment_questions: 'select id, question_set_id, question_number, question_key from assessment_questions order by created_at asc nulls last, id asc limit 5',
    assessment_question_options: 'select id, question_id, option_key, display_order from assessment_question_options order by created_at asc nulls last, id asc limit 5',
    assessment_option_signal_mappings: 'select id, question_option_id, signal_code, signal_weight from assessment_option_signal_mappings order by created_at asc nulls last, id asc limit 5',
    assessment_saved_scenarios: 'select id, assessment_definition_id, assessment_version_id, name, status from assessment_saved_scenarios order by created_at asc nulls last, id asc limit 5',
    assessment_version_saved_scenarios: 'select id, assessment_version_id, name, status from assessment_version_saved_scenarios order by created_at asc nulls last, id asc limit 5',
  }

  const sql = sampleSqlByTable[tableName]
  if (!sql) {
    return []
  }

  const result = await queryDb<SampleRow>(sql)
  return result.rows
}

async function resolveOwnerContext(flags: ParsedFlags, existingTables: Set<string>): Promise<ResolvedOwnerContext> {
  let userId: string | null = null
  let email = flags.ownerEmail
  let externalAuthId = flags.ownerExternalAuthId
  let adminIdentityId: string | null = null

  if (existingTables.has('users') && (flags.ownerUserId || flags.ownerEmail || flags.ownerExternalAuthId)) {
    const result = await queryDb<OwnerUserRow>(
      `select id, email, external_auth_id
       from users
       where ($1::uuid is not null and id = $1)
          or ($2::text is not null and lower(email) = lower($2))
          or ($3::text is not null and external_auth_id = $3)
       order by case when $1::uuid is not null and id = $1 then 0 else 1 end,
                case when $2::text is not null and lower(email) = lower($2) then 0 else 1 end,
                case when $3::text is not null and external_auth_id = $3 then 0 else 1 end
       limit 1`,
      [flags.ownerUserId, flags.ownerEmail, flags.ownerExternalAuthId],
    )

    const match = result.rows[0]
    if (match) {
      userId = match.id
      email = match.email ?? email
      externalAuthId = match.external_auth_id ?? externalAuthId
    }
  }

  if (existingTables.has('admin_identities') && (userId || email || externalAuthId)) {
    const result = await queryDb<AdminIdentityRow>(
      `select id, email, auth_subject
       from admin_identities
       where ($1::uuid is not null and id = $1)
          or ($2::text is not null and lower(email) = lower($2))
          or ($3::text is not null and auth_subject = $3)
       order by case when $1::uuid is not null and id = $1 then 0 else 1 end,
                case when $2::text is not null and lower(email) = lower($2) then 0 else 1 end,
                case when $3::text is not null and auth_subject = $3 then 0 else 1 end
       limit 1`,
      [userId, email, externalAuthId],
    )

    const match = result.rows[0]
    if (match) {
      adminIdentityId = match.id
      email = match.email ?? email
      externalAuthId = match.auth_subject ?? externalAuthId
    }
  }

  return {
    userId,
    email,
    externalAuthId,
    adminIdentityId,
  }
}

async function resolveAssessmentShellContext(flags: ParsedFlags, existingTables: Set<string>): Promise<AssessmentShellContext> {
  if (!existingTables.has('assessment_versions')) {
    return {
      preserveVersionIds: [],
      preserveDefinitionIds: [],
      preserveVersionKeys: flags.preserveAssessmentVersionKeys,
    }
  }

  const result = await queryDb<PreservedVersionRow>(
    `select id, key, assessment_definition_id
     from assessment_versions
     where key = any($1::text[])`,
    [flags.preserveAssessmentVersionKeys],
  )

  return {
    preserveVersionIds: result.rows.map((row) => row.id),
    preserveDefinitionIds: Array.from(new Set(result.rows.flatMap((row) => row.assessment_definition_id ? [row.assessment_definition_id] : []))),
    preserveVersionKeys: Array.from(new Set([...flags.preserveAssessmentVersionKeys, ...result.rows.map((row) => row.key)])),
  }
}

async function buildInventory(existingTables: Set<string>) {
  const inventory: Array<{ tableName: string; category: string; count: number; samples: QueryResultRow[] }> = []

  for (const entry of DATA_ALIGNMENT_TABLES) {
    if (!existingTables.has(entry.tableName)) {
      continue
    }

    const count = await loadTableCount(entry.tableName)
    const samples = count > 0 ? await loadTableSamples(entry.tableName) : []
    inventory.push({
      tableName: entry.tableName,
      category: entry.category,
      count,
      samples,
    })
  }

  return inventory
}

async function run() {
  const flags = parseFlags(process.argv.slice(2))

  if (flags.help) {
    printHelp()
    return
  }

  if (flags.apply && flags.confirmationToken !== APPLY_CONFIRMATION_TOKEN) {
    throw new Error(`--apply requires --confirm ${APPLY_CONFIRMATION_TOKEN}`)
  }

  const existingTables = await loadExistingTables()
  const owner = await resolveOwnerContext(flags, existingTables)
  const assessmentShell = await resolveAssessmentShellContext(flags, existingTables)
  const applySafetyProblems = validateApplySafety({ owner, allowEmptyUsers: flags.allowEmptyUsers })
  if (flags.apply && applySafetyProblems.length) {
    throw new Error(applySafetyProblems.join(' '))
  }

  const input: BuildAlignmentOperationsInput = {
    owner,
    assessmentShell,
    preserveOrganisationIds: flags.preserveOrganisationIds,
  }
  const operations = buildAlignmentOperations(input).filter((operation) => existingTables.has(operation.tableName))
  const inventory = await buildInventory(existingTables)
  const dependencyMap = (await fetchForeignKeyDependencyMap(queryDb, DATA_ALIGNMENT_TABLES.map((entry) => entry.tableName))).rows
  const manualSqlPlan = buildManualSqlPlan(operations)

  const report = {
    mode: flags.apply ? 'apply' : 'audit',
    confirmationRequired: APPLY_CONFIRMATION_TOKEN,
    backupGuidance: buildBackupGuidance(),
    owner,
    assessmentShell,
    preserveOrganisationIds: flags.preserveOrganisationIds,
    protectedTables: getTablesByCategory('protected_governance').map((entry) => entry.tableName),
    groupedTables: {
      protectedGovernance: getTablesByCategory('protected_governance'),
      authLinkage: getTablesByCategory('auth_linkage'),
      userOrgState: getTablesByCategory('user_org_state'),
      assessmentRuntime: getTablesByCategory('assessment_runtime'),
      assessmentContent: getTablesByCategory('assessment_content'),
    },
    dependencyMap,
    inventory,
    plannedOperations: operations,
    applySafetyProblems,
    manualSqlPlan,
  }

  if (flags.apply) {
    const executionResults = await withTransaction(async (client) => {
      const results: Array<{ key: string; tableName: string; kind: string; rowCount: number | null }> = []
      await client.query("set local lock_timeout = '5s'")
      await client.query("set local statement_timeout = '60s'")

      for (const operation of operations) {
        const result = await client.query(operation.sql, operation.params)
        results.push({
          key: operation.key,
          tableName: operation.tableName,
          kind: operation.kind,
          rowCount: result.rowCount,
        })
      }

      return results
    })

    const output = {
      ...report,
      executionResults,
    }

    if (flags.json) {
      console.log(JSON.stringify(output, null, 2))
      return
    }

    console.log('Sonartra MVP baseline alignment applied.')
    console.log('')
    console.log('Backup guidance:')
    console.log(buildBackupGuidance().join('\n'))
    console.log('')
    console.log('Resolved owner:')
    console.log(JSON.stringify(owner, null, 2))
    console.log('')
    console.log('Execution results:')
    for (const result of executionResults) {
      console.log(`- ${result.key} (${result.tableName}, ${result.kind}) -> rowCount=${result.rowCount ?? 'n/a'}`)
    }
    console.log('')
    console.log('Preserved assessment shell keys:', assessmentShell.preserveVersionKeys.join(', ') || '(none)')
    return
  }

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2))
    return
  }

  console.log('Sonartra MVP baseline alignment audit (read-only).')
  console.log('')
  console.log('Backup guidance:')
  console.log(buildBackupGuidance().join('\n'))
  console.log('')
  console.log('Resolved owner context:')
  console.log(JSON.stringify(owner, null, 2))
  console.log('')
  console.log('Protected tables:')
  for (const tableName of report.protectedTables) {
    console.log(`- ${tableName}`)
  }
  console.log('')
  console.log('Dependency map:')
  for (const dependency of dependencyMap) {
    console.log(`- ${dependency.source_table} -> ${dependency.target_table} (${dependency.constraint_name}, on delete ${dependency.delete_rule.toLowerCase()})`)
  }
  console.log('')
  console.log('Inventory:')
  for (const row of inventory) {
    console.log(`- ${row.tableName} [${row.category}] count=${row.count}`)
    if (row.samples.length) {
      console.log(`  samples=${JSON.stringify(row.samples)}`)
    }
  }
  console.log('')
  if (applySafetyProblems.length) {
    console.log('Apply safety blockers:')
    for (const problem of applySafetyProblems) {
      console.log(`- ${problem}`)
    }
    console.log('')
  }
  console.log('Planned operations:')
  for (const operation of operations) {
    console.log(`- ${operation.key}: ${operation.description}`)
  }
  console.log('')
  console.log('Manual SQL plan:')
  console.log(manualSqlPlan)
}

run().catch((error) => {
  console.error('[align-mvp-baseline] Failed.', error)
  process.exitCode = 1
})
