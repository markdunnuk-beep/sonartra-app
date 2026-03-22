import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// @ts-expect-error -- tests import small JS helpers used by the migration runner.
import { resolveMigrationFiles } from '../scripts/migration-files.mjs'
// @ts-expect-error -- tests import a small JS helper used by the migration runner.
import { normalizeMigrationSql } from '../scripts/run-migrations.mjs'

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
