import { readdir } from 'node:fs/promises';

function shouldIncludeMigration(fileName, env = process.env) {
  if (!/^\d+_.+\.sql$/i.test(fileName)) {
    return false;
  }

  if (/_seed\.sql$/i.test(fileName) && env.INCLUDE_SEED_MIGRATIONS !== 'true') {
    return false;
  }

  return true;
}

export async function resolveMigrationFiles(migrationsDir, env = process.env) {
  const files = await readdir(migrationsDir, { withFileTypes: true });

  const migrationFiles = files
    .filter((entry) => entry.isFile() && shouldIncludeMigration(entry.name, env))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const skippedSeedFiles = files
    .filter((entry) => entry.isFile() && /_seed\.sql$/i.test(entry.name) && !shouldIncludeMigration(entry.name, env))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return {
    migrationFiles,
    skippedSeedFiles,
  };
}
