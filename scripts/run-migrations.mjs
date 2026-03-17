import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const migrationsDir = path.join(process.cwd(), 'db', 'migrations');

async function resolveMigrationFiles() {
  const files = await readdir(migrationsDir, { withFileTypes: true });

  return files
    .filter((entry) => entry.isFile() && /^\d+_.+\.sql$/i.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const client = new Client({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

await client.connect();

try {
  const migrationFiles = await resolveMigrationFiles();

  if (migrationFiles.length === 0) {
    throw new Error(`No migration files found in ${migrationsDir}`);
  }

  for (const fileName of migrationFiles) {
    const filePath = path.join(migrationsDir, fileName);
    const sql = await readFile(filePath, 'utf8');

    console.log(`Applying migration: ${fileName}`);
    await client.query(sql);
  }

  console.log('Migrations completed successfully.');
} finally {
  await client.end();
}
