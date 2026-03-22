import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { Client } from 'pg';
import { resolveMigrationFiles } from './migration-files.mjs';

const migrationsDir = path.join(process.cwd(), 'db', 'migrations');

function isIgnorablePreambleLine(line) {
  const trimmed = line.trim();
  return trimmed === '' || trimmed.startsWith('--');
}

function findFirstMeaningfulLineIndex(lines) {
  return lines.findIndex((line) => !isIgnorablePreambleLine(line));
}

function findLastMeaningfulLineIndex(lines) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (!isIgnorablePreambleLine(lines[index])) {
      return index;
    }
  }

  return -1;
}

export function normalizeMigrationSql(sql) {
  const lines = sql.split(/\r?\n/);
  const firstMeaningfulLineIndex = findFirstMeaningfulLineIndex(lines);
  const lastMeaningfulLineIndex = findLastMeaningfulLineIndex(lines);

  if (firstMeaningfulLineIndex === -1 || lastMeaningfulLineIndex === -1) {
    return {
      sql,
      hadExplicitTransactionWrapper: false,
    };
  }

  const firstMeaningfulLine = lines[firstMeaningfulLineIndex]?.trim().replace(/;$/, '').toUpperCase();
  const lastMeaningfulLine = lines[lastMeaningfulLineIndex]?.trim().replace(/;$/, '').toUpperCase();

  if (firstMeaningfulLine !== 'BEGIN' || lastMeaningfulLine !== 'COMMIT') {
    return {
      sql,
      hadExplicitTransactionWrapper: false,
    };
  }

  const normalizedLines = lines.filter((_, index) => index !== firstMeaningfulLineIndex && index !== lastMeaningfulLineIndex);

  return {
    sql: normalizedLines.join('\n'),
    hadExplicitTransactionWrapper: true,
  };
}

async function ensureMigrationTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT now()
    )
  `);
}

async function getAppliedMigrationIds(client) {
  const result = await client.query('SELECT id FROM schema_migrations ORDER BY id ASC');
  return new Set(result.rows.map((row) => row.id));
}

function buildMigrationPlan(migrationFiles, appliedMigrationIds) {
  const pendingMigrationFiles = migrationFiles.filter((fileName) => !appliedMigrationIds.has(fileName));
  const alreadyAppliedMigrationFiles = migrationFiles.filter((fileName) => appliedMigrationIds.has(fileName));
  const recordedButMissingMigrationFiles = [...appliedMigrationIds].filter((fileName) => !migrationFiles.includes(fileName));

  return {
    pendingMigrationFiles,
    alreadyAppliedMigrationFiles,
    recordedButMissingMigrationFiles,
  };
}

export async function getMigrationDiagnostics(client) {
  const result = await client.query(`
    SELECT
      current_database() AS database_name,
      current_schema() AS schema_name,
      current_user AS database_user,
      current_setting('search_path') AS search_path
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
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [fileName]);
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
    const { migrationFiles, skippedSeedFiles } = await resolveMigrationFiles(migrationsDir);

    if (migrationFiles.length === 0) {
      throw new Error(`No migration files found in ${migrationsDir}`);
    }

    if (skippedSeedFiles.length > 0) {
      console.log(`→ Skipping seed migrations (set INCLUDE_SEED_MIGRATIONS=true to include): ${skippedSeedFiles.join(', ')}`);
    }

    await ensureMigrationTrackingTable(client);

    const diagnostics = await getMigrationDiagnostics(client);
    if (diagnostics) {
      console.log(`→ Migration target database=${diagnostics.database_name} schema=${diagnostics.schema_name} user=${diagnostics.database_user} search_path=${diagnostics.search_path}`);
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
