import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';
import { resolveMigrationFiles } from './migration-files.mjs';
import { buildMigrationPlan, normalizeMigrationSql } from './migration-runner-helpers.mjs';

const migrationsDir = path.join(process.cwd(), 'db', 'migrations');
const schemaMigrationsTableName = 'public.schema_migrations';

async function ensureMigrationTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${schemaMigrationsTableName} (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT now()
    )
  `);
}

async function getAppliedMigrationIds(client) {
  const result = await client.query(`SELECT id FROM ${schemaMigrationsTableName} ORDER BY id ASC`);
  return new Set(result.rows.map((row) => row.id));
}

export async function getMigrationDiagnostics(client) {
  const result = await client.query(`
    SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      current_user AS database_user,
      current_setting('search_path') AS search_path,
      (
        SELECT n.nspname
        FROM pg_class c
        INNER JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.oid = to_regclass('assessment_versions')
      ) AS assessment_versions_schema,
      to_regclass('assessment_versions')::text AS assessment_versions_regclass,
      (
        SELECT n.nspname
        FROM pg_class c
        INNER JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.oid = to_regclass('${schemaMigrationsTableName}')
      ) AS schema_migrations_schema,
      to_regclass('${schemaMigrationsTableName}')::text AS schema_migrations_regclass
  `);

  return result.rows[0] ?? null;
}

async function applyMigration(client, fileName) {
  const filePath = path.join(migrationsDir, fileName);
  const rawSql = await readFile(filePath, 'utf8');
  const { sql, hadExplicitTransactionWrapper } = normalizeMigrationSql(rawSql);

  console.log(`→ Applying ${fileName}`);
  if (hadExplicitTransactionWrapper) {
    console.log(`  ℹ Normalized explicit BEGIN/COMMIT wrapper in ${fileName} so schema changes and schema_migrations insert stay atomic.`);
  }

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query(`INSERT INTO ${schemaMigrationsTableName} (id) VALUES ($1)`, [fileName]);
    await client.query('COMMIT');
    console.log(`✓ Applied ${fileName}`);
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors and surface original migration failure.
    }

    console.error(`✗ Failed ${fileName}`);
    throw error;
  }
}

async function runMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Set it before running `npm run db:migrate`.');
  }

  const client = new Client({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  });

  await client.connect();

  try {
    const { migrationFiles, skippedSeedFiles, legacyDuplicateVersionGroups } = await resolveMigrationFiles(migrationsDir);

    if (migrationFiles.length === 0) {
      throw new Error(`No migration files found in ${migrationsDir}`);
    }

    if (skippedSeedFiles.length > 0) {
      console.log(`→ Skipping seed migrations (set INCLUDE_SEED_MIGRATIONS=true to include): ${skippedSeedFiles.join(', ')}`);
    }

    if (legacyDuplicateVersionGroups.length > 0) {
      console.warn(
        `→ Legacy duplicate migration versions detected and allowed in explicit order: ${legacyDuplicateVersionGroups.map(({ version, fileNames }) => `${version}=[${fileNames.join(' -> ')}]`).join(', ')}`,
      );
    }

    await ensureMigrationTrackingTable(client);

    const diagnostics = await getMigrationDiagnostics(client);
    if (diagnostics) {
      console.log(
        `→ Migration target database=${diagnostics.database_name} schema=${diagnostics.schema_name} user=${diagnostics.database_user} search_path=${diagnostics.search_path} assessment_versions=${diagnostics.assessment_versions_regclass ?? 'missing'} assessment_versions_schema=${diagnostics.assessment_versions_schema ?? 'missing'} schema_migrations=${diagnostics.schema_migrations_regclass ?? 'missing'} schema_migrations_schema=${diagnostics.schema_migrations_schema ?? 'missing'}`,
      );
    }

    const appliedMigrationIds = await getAppliedMigrationIds(client);
    const {
      pendingMigrationFiles,
      alreadyAppliedMigrationFiles,
      recordedButMissingMigrationFiles,
    } = buildMigrationPlan(migrationFiles, appliedMigrationIds);

    console.log(`→ Migration files discovered (${migrationFiles.length}): ${migrationFiles.join(', ')}`);
    console.log(`→ Already applied (${alreadyAppliedMigrationFiles.length}): ${alreadyAppliedMigrationFiles.length > 0 ? alreadyAppliedMigrationFiles.join(', ') : 'none'}`);
    console.log(`→ Pending (${pendingMigrationFiles.length}): ${pendingMigrationFiles.length > 0 ? pendingMigrationFiles.join(', ') : 'none'}`);

    if (recordedButMissingMigrationFiles.length > 0) {
      console.warn(`→ Recorded in schema_migrations but missing from db/migrations (${recordedButMissingMigrationFiles.length}): ${recordedButMissingMigrationFiles.join(', ')}`);
    }

    for (const fileName of alreadyAppliedMigrationFiles) {
      console.log(`→ Skipping already applied migration ${fileName}`);
    }

    for (const fileName of pendingMigrationFiles) {
      await applyMigration(client, fileName);
    }

    console.log('Migrations completed successfully.');
  } finally {
    await client.end();
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
const isDirectExecution = invokedPath !== null && import.meta.url === pathToFileURL(invokedPath).href;

if (isDirectExecution) {
  try {
    await runMigrations();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
