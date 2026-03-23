import type { QueryResultRow } from 'pg'

import { queryDb } from '../lib/db'
import {
  buildVerificationChecks,
  DEFAULT_PRESERVED_ASSESSMENT_VERSION_KEYS,
  type AssessmentShellContext,
  type BuildAlignmentOperationsInput,
  type ResolvedOwnerContext,
} from '../lib/server/data-alignment'

interface CountRow extends QueryResultRow {
  count: string | number
}

interface ExistingTableRow {
  table_name: string
}

interface PreservedVersionRow {
  id: string
  key: string
  assessment_definition_id: string | null
}


function hasFlag(name: string): boolean {
  return process.argv.slice(2).some((token) => token === name || token.startsWith(`${name}=`))
}

function printHelp() {
  console.log([
    'Verify that the Sonartra database now matches the intended MVP baseline.',
    '',
    'Usage:',
    '  npx tsx scripts/verify-mvp-baseline.ts --owner-user-id <users.id> --owner-admin-identity-id <admin_identities.id>',
    '',
    'Optional flags:',
    '  --preserve-organisation-ids <uuid,uuid>',
    '  --preserve-assessment-version-keys <key,key>',
    '  --clear-assessment-shells',
    '  --help',
  ].join('\n'))
}

function parseListFlag(value: string | null): string[] {
  if (!value) {
    return []
  }

  return value.split(',').map((entry) => entry.trim()).filter(Boolean)
}

function getFlagValue(name: string): string | null {
  const args = process.argv.slice(2)
  for (let index = 0; index < args.length; index += 1) {
    const token = args[index]
    if (token === name) {
      const next = args[index + 1]
      return next && !next.startsWith('--') ? next : null
    }
    if (token.startsWith(`${name}=`)) {
      return token.slice(name.length + 1)
    }
  }

  return null
}

async function loadExistingTables() {
  const result = await queryDb<ExistingTableRow>(
    `select table_name
     from information_schema.tables
     where table_schema = current_schema()`
  )

  return new Set(result.rows.map((row) => row.table_name))
}

async function resolveAssessmentShellContext(versionKeys: string[]): Promise<AssessmentShellContext> {
  const result = await queryDb<PreservedVersionRow>(
    `select id, key, assessment_definition_id
     from assessment_versions
     where key = any($1::text[])`,
    [versionKeys],
  )

  return {
    preserveVersionIds: result.rows.map((row) => row.id),
    preserveDefinitionIds: Array.from(new Set(result.rows.flatMap((row) => row.assessment_definition_id ? [row.assessment_definition_id] : []))),
    preserveVersionKeys: versionKeys,
  }
}

async function run() {
  if (hasFlag('--help') || hasFlag('-h')) {
    printHelp()
    return
  }

  const ownerUserId = getFlagValue('--owner-user-id')
  const ownerAdminIdentityId = getFlagValue('--owner-admin-identity-id')
  const preserveOrganisationIds = parseListFlag(getFlagValue('--preserve-organisation-ids'))
  const preserveAssessmentVersionKeys = parseListFlag(getFlagValue('--preserve-assessment-version-keys'))
  const clearAssessmentShells = hasFlag('--clear-assessment-shells')
  const existingTables = await loadExistingTables()

  const owner: ResolvedOwnerContext = {
    userId: ownerUserId,
    adminIdentityId: ownerAdminIdentityId,
    email: null,
    externalAuthId: null,
  }

  const assessmentShell = existingTables.has('assessment_versions')
    ? await resolveAssessmentShellContext(clearAssessmentShells
      ? []
      : preserveAssessmentVersionKeys.length ? preserveAssessmentVersionKeys : [...DEFAULT_PRESERVED_ASSESSMENT_VERSION_KEYS])
    : { preserveVersionIds: [], preserveDefinitionIds: [], preserveVersionKeys: [] }

  const input: BuildAlignmentOperationsInput = {
    owner,
    assessmentShell,
    preserveOrganisationIds,
  }

  const checks = buildVerificationChecks(input).filter((check) => {
    if (check.key === 'preserved_version_count' && !existingTables.has('assessment_versions')) {
      return false
    }
    return true
  })

  const results: Array<{ key: string; description: string; actual: number; expected: number; passed: boolean }> = []

  for (const check of checks) {
    const result = await queryDb<CountRow>(check.sql, check.params)
    const raw = result.rows[0]?.count ?? 0
    const actual = typeof raw === 'number' ? raw : Number.parseInt(String(raw), 10)
    results.push({
      key: check.key,
      description: check.description,
      actual,
      expected: check.expectedValue,
      passed: actual === check.expectedValue,
    })
  }

  const failed = results.filter((result) => !result.passed)

  console.log('Sonartra MVP baseline verification report')
  for (const result of results) {
    console.log(`- ${result.passed ? 'PASS' : 'FAIL'} ${result.key}: actual=${result.actual} expected=${result.expected} :: ${result.description}`)
  }

  if (failed.length) {
    process.exitCode = 1
  }
}

run().catch((error) => {
  console.error('[verify-mvp-baseline] Failed.', error)
  process.exitCode = 1
})
