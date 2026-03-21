export function resolveMigrationFiles(
  migrationsDir: string,
  env?: Record<string, string | undefined>,
): Promise<{
  migrationFiles: string[]
  skippedSeedFiles: string[]
}>
