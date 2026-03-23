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

export function buildMigrationPlan(migrationFiles, appliedMigrationIds) {
  const pendingMigrationFiles = migrationFiles.filter((fileName) => !appliedMigrationIds.has(fileName));
  const alreadyAppliedMigrationFiles = migrationFiles.filter((fileName) => appliedMigrationIds.has(fileName));
  const recordedButMissingMigrationFiles = [...appliedMigrationIds].filter((fileName) => !migrationFiles.includes(fileName));

  return {
    pendingMigrationFiles,
    alreadyAppliedMigrationFiles,
    recordedButMissingMigrationFiles,
  };
}
