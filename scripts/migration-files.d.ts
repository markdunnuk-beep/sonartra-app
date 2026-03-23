export type MigrationVersionGroup = {
  version: string
  fileNames: string[]
}

export declare const legacyDuplicateMigrationOrder: Readonly<Record<string, readonly string[]>>

export declare function parseMigrationFileName(fileName: string): {
  fileName: string
  version: string
  description: string
}

export declare function compareMigrationFileNames(leftFileName: string, rightFileName: string): number

export declare function validateMigrationFiles(migrationFiles: string[]): {
  duplicateVersionGroups: MigrationVersionGroup[]
  legacyDuplicateVersionGroups: MigrationVersionGroup[]
}

export declare function resolveMigrationFiles(
  migrationsDir: string,
  env?: NodeJS.ProcessEnv,
): Promise<{
  migrationFiles: string[]
  skippedSeedFiles: string[]
  duplicateVersionGroups: MigrationVersionGroup[]
  legacyDuplicateVersionGroups: MigrationVersionGroup[]
}>
