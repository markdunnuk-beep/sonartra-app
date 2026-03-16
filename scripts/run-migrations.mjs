import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { Client } from 'pg';

const migrationFiles = ['0001_assessment_foundation.sql'];

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is required to run migrations.');
}

const client = new Client({ connectionString, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined });

await client.connect();

try {
  for (const fileName of migrationFiles) {
    const filePath = path.join(process.cwd(), 'db', 'migrations', fileName);
    const sql = await readFile(filePath, 'utf8');

    console.log(`Applying migration: ${fileName}`);
    await client.query(sql);
  }

  console.log('Migrations completed successfully.');
} finally {
  await client.end();
}
