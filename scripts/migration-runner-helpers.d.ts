export declare function normalizeMigrationSql(sql: string): {
  sql: string
  hadExplicitTransactionWrapper: boolean
}

export declare function buildMigrationPlan(
  migrationFiles: string[],
  appliedMigrationIds: ReadonlySet<string>,
): {
  pendingMigrationFiles: string[]
  alreadyAppliedMigrationFiles: string[]
  recordedButMissingMigrationFiles: string[]
}
