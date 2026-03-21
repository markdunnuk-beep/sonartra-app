import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

// @ts-expect-error -- test imports a small JS helper used by the migration runner.
import { resolveMigrationFiles } from '../scripts/migration-files.mjs'

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
