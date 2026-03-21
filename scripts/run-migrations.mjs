import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';
import { resolveMigrationFiles } from './migration-files.mjs';

const migrationsDir = path.join(process.cwd(), 'db', 'migrations');

async function ensureMigrationTrackingTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMP DEFAULT now()
    )
  `);
}

async function isMigrationApplied(client, fileName) {
  const result = await client.query('SELECT 1 FROM schema_migrations WHERE id = $1 LIMIT 1', [fileName]);
  return result.rowCount > 0;
}

async function applyMigration(client, fileName) {
  const filePath = path.join(migrationsDir, fileName);
  const sql = await readFile(filePath, 'utf8');

  console.log(`→ Applying ${fileName}`);

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('INSERT INTO schema_migrations (id) VALUES ($1)', [fileName]);
    await client.query('COMMIT');
    console.log('✓ Applied');
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch {
      // Ignore rollback errors and surface original migration failure.
    }

    console.error(`✗ Failed (${fileName})`);
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

    for (const fileName of migrationFiles) {
      const applied = await isMigrationApplied(client, fileName);

      if (applied) {
        console.log(`→ Applying ${fileName}`);
        console.log('→ Skipping already applied migration');
        continue;
      }

      await applyMigration(client, fileName);
    }

    console.log('Migrations completed successfully.');
  } finally {
    await client.end();
  }
}

try {
  await runMigrations();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
