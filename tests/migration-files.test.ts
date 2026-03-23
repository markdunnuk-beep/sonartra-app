import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// @ts-ignore -- tests import small JS helpers used by the migration runner.
import { compareMigrationFileNames, legacyDuplicateMigrationOrder, resolveMigrationFiles, validateMigrationFiles } from '../scripts/migration-files.mjs'
// @ts-ignore -- tests import small JS helpers used by the migration runner.
import { buildMigrationPlan, normalizeMigrationSql } from '../scripts/migration-runner-helpers.mjs'
// @ts-ignore -- tests import small JS helpers used by the migration audit workflow.
import { analyzeMigrationAuditState, buildSchemaSanityReport } from '../scripts/migration-audit-helpers.mjs'

async function createTempMigrationsDir() {
  const dir = await mkdtemp(path.join(tmpdir(), 'sonartra-migrations-'))

  await Promise.all([
    writeFile(path.join(dir, '0001_assessment_foundation.sql'), '-- migration'),
    writeFile(path.join(dir, '0007_admin_access_registry_seed.sql'), '-- seed migration'),
    writeFile(path.join(dir, '0008_assessment_version_packages.sql'), '-- migration'),
    writeFile(path.join(dir, 'notes.txt'), 'ignore me'),
  ])

  return dir
}

test('migration resolver excludes seed migrations by default', async () => {
  const dir = await createTempMigrationsDir()
  const result = await resolveMigrationFiles(dir, {})

  assert.deepEqual(result.migrationFiles, [
    '0001_assessment_foundation.sql',
    '0008_assessment_version_packages.sql',
  ])
  assert.deepEqual(result.skippedSeedFiles, ['0007_admin_access_registry_seed.sql'])
  assert.deepEqual(result.duplicateVersionGroups, [])
})

test('migration resolver includes seed migrations only when explicitly enabled', async () => {
  const dir = await createTempMigrationsDir()
  const result = await resolveMigrationFiles(dir, { INCLUDE_SEED_MIGRATIONS: 'true' })

  assert.deepEqual(result.migrationFiles, [
    '0001_assessment_foundation.sql',
    '0007_admin_access_registry_seed.sql',
    '0008_assessment_version_packages.sql',
  ])
  assert.deepEqual(result.skippedSeedFiles, [])
})

test('migration resolver reports the grandfathered legacy duplicate versions in the repo', async () => {
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations')
  const result = await resolveMigrationFiles(migrationsDir, {})

  assert.deepEqual(result.legacyDuplicateVersionGroups, [
    {
      version: '0009',
      fileNames: [...legacyDuplicateMigrationOrder['0009']],
    },
  ])
  assert.ok(result.migrationFiles.includes('0011_migration_ordering_hardening_checkpoint.sql'))
})

test('migration resolver includes seed migrations only when explicitly enabled and preserves explicit legacy duplicate order', async () => {
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations')
  const result = await resolveMigrationFiles(migrationsDir, { INCLUDE_SEED_MIGRATIONS: 'true' })

  assert.deepEqual(result.legacyDuplicateVersionGroups, [
    {
      version: '0007',
      fileNames: [...legacyDuplicateMigrationOrder['0007']],
    },
    {
      version: '0009',
      fileNames: [...legacyDuplicateMigrationOrder['0009']],
    },
  ])
})

test('migration ordering is deterministic by numeric version first and filename second', () => {
  const unorderedFiles = [
    '0010_zeta.sql',
    '0009_bravo.sql',
    '0002_alpha.sql',
    '0010_alpha.sql',
  ]

  const orderedFiles = [...unorderedFiles].sort(compareMigrationFileNames)

  assert.deepEqual(orderedFiles, [
    '0002_alpha.sql',
    '0009_bravo.sql',
    '0010_alpha.sql',
    '0010_zeta.sql',
  ])
})

test('duplicate migration version validation fails fast for non-grandfathered duplicates', () => {
  assert.throws(
    () => validateMigrationFiles([
      '0001_initial.sql',
      '0002_add_users.sql',
      '0002_add_roles.sql',
    ]),
    /Duplicate migration version prefixes detected: 0002: 0002_add_roles\.sql, 0002_add_users\.sql\./,
  )
})

test('repo migration set for npm run db:migrate includes release governance migration 0010', async () => {
  const migrationsDir = path.join(process.cwd(), 'db', 'migrations')
  const result = await resolveMigrationFiles(migrationsDir, {})

  assert.ok(result.migrationFiles.includes('0010_assessment_version_release_governance.sql'))
})

test('migration SQL normalization removes file-level BEGIN/COMMIT wrappers to preserve atomic recording', () => {
  const sql = `-- comment\n\nBEGIN;\nALTER TABLE assessment_versions ADD COLUMN IF NOT EXISTS publish_readiness_status TEXT;\nCOMMIT;\n`

  const result = normalizeMigrationSql(sql)

  assert.equal(result.hadExplicitTransactionWrapper, true)
  assert.doesNotMatch(result.sql, /^\s*BEGIN;?/m)
  assert.doesNotMatch(result.sql, /^\s*COMMIT;?/m)
  assert.match(result.sql, /ALTER TABLE assessment_versions ADD COLUMN IF NOT EXISTS publish_readiness_status TEXT;/)
})

test('migration SQL normalization leaves wrapper-free SQL unchanged', () => {
  const sql = 'CREATE TABLE example(id INT);\n'

  const result = normalizeMigrationSql(sql)

  assert.equal(result.hadExplicitTransactionWrapper, false)
  assert.equal(result.sql, sql)
})

test('migration runner records schema_migrations in the public schema and logs resolved relation context', async () => {
  const runnerSource = await readFile(path.join(process.cwd(), 'scripts', 'run-migrations.mjs'), 'utf8')

  assert.match(runnerSource, /const schemaMigrationsTableName = 'public\.schema_migrations'/)
  assert.match(runnerSource, /to_regclass\('assessment_versions'\)::text AS assessment_versions_regclass/)
  assert.match(runnerSource, /to_regclass\('\$\{schemaMigrationsTableName\}'\)::text AS schema_migrations_regclass/)
})

test('migration runner plans pending work against full filenames so already-recorded legacy duplicates remain compatible', () => {
  const migrationFiles = [
    '0009_assessment_saved_scenarios.sql',
    '0009_assessment_version_saved_scenarios.sql',
    '0010_assessment_version_release_governance.sql',
    '0011_migration_ordering_hardening_checkpoint.sql',
  ]
  const appliedMigrationIds = new Set([
    '0009_assessment_saved_scenarios.sql',
    '0010_assessment_version_release_governance.sql',
  ])

  const result = buildMigrationPlan(migrationFiles, appliedMigrationIds)

  assert.deepEqual(result.alreadyAppliedMigrationFiles, [
    '0009_assessment_saved_scenarios.sql',
    '0010_assessment_version_release_governance.sql',
  ])
  assert.deepEqual(result.pendingMigrationFiles, [
    '0009_assessment_version_saved_scenarios.sql',
    '0011_migration_ordering_hardening_checkpoint.sql',
  ])
  assert.deepEqual(result.recordedButMissingMigrationFiles, [])
})


test('migration audit reports pending and missing migrations by full filename identifiers', () => {
  const result = analyzeMigrationAuditState({
    migrationFiles: [
      '0009_assessment_saved_scenarios.sql',
      '0009_assessment_version_saved_scenarios.sql',
      '0010_assessment_version_release_governance.sql',
      '0011_migration_ordering_hardening_checkpoint.sql',
    ],
    legacyDuplicateVersionGroups: [
      {
        version: '0009',
        fileNames: [
          '0009_assessment_saved_scenarios.sql',
          '0009_assessment_version_saved_scenarios.sql',
        ],
      },
    ],
    recordedMigrationRows: [
      { id: '0009_assessment_saved_scenarios.sql', applied_at: '2026-03-18T10:00:00.000Z' },
      { id: '0010_assessment_version_release_governance.sql', applied_at: '2026-03-18T10:05:00.000Z' },
      { id: '0999_manual_hotfix.sql', applied_at: '2026-03-18T10:10:00.000Z' },
    ],
  })

  assert.deepEqual(result.pendingMigrationFiles, [
    '0009_assessment_version_saved_scenarios.sql',
    '0011_migration_ordering_hardening_checkpoint.sql',
  ])
  assert.deepEqual(result.recordedButMissingMigrationFiles, ['0999_manual_hotfix.sql'])
  assert.deepEqual(result.recordedOrderAnomalies, [])
  assert.equal(result.hasFailures, true)
})

test('migration audit flags applied_at ordering anomalies against source order', () => {
  const result = analyzeMigrationAuditState({
    migrationFiles: [
      '0009_assessment_saved_scenarios.sql',
      '0009_assessment_version_saved_scenarios.sql',
      '0010_assessment_version_release_governance.sql',
    ],
    legacyDuplicateVersionGroups: [
      {
        version: '0009',
        fileNames: [
          '0009_assessment_saved_scenarios.sql',
          '0009_assessment_version_saved_scenarios.sql',
        ],
      },
    ],
    recordedMigrationRows: [
      { id: '0010_assessment_version_release_governance.sql', applied_at: '2026-03-18T10:05:00.000Z' },
      { id: '0009_assessment_saved_scenarios.sql', applied_at: '2026-03-18T10:10:00.000Z' },
    ],
  })

  assert.deepEqual(result.recordedOrderAnomalies, [
    {
      previousId: '0010_assessment_version_release_governance.sql',
      previousAppliedAt: '2026-03-18T10:05:00.000Z',
      currentId: '0009_assessment_saved_scenarios.sql',
      currentAppliedAt: '2026-03-18T10:10:00.000Z',
    },
  ])
})

test('schema sanity report marks missing critical columns as failures', () => {
  const report = buildSchemaSanityReport({
    schemaName: 'public',
    existingTableNames: new Set(['schema_migrations', 'assessment_versions']),
    columnsByTableName: new Map([
      ['schema_migrations', ['id', 'applied_at']],
      ['assessment_versions', ['id', 'key', 'name', 'total_questions', 'is_active']],
    ]),
  })

  const assessmentVersions = report.tables.find((table: { tableName: string }) => table.tableName === 'assessment_versions')
  assert.ok(assessmentVersions)
  assert.equal(assessmentVersions?.isHealthy, false)
  assert.deepEqual(assessmentVersions?.missingRequiredColumns, ['publish_readiness_status', 'sign_off_status'])
  assert.equal(report.hasFailures, true)
})
