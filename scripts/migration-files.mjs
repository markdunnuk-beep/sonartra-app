import { readdir } from 'node:fs/promises';

const migrationFilePattern = /^(?<version>\d+)_(?<name>.+)\.sql$/i;

export const legacyDuplicateMigrationOrder = Object.freeze({
  '0007': Object.freeze([
    '0007_admin_access_registry_seed.sql',
    '0007_assessment_admin_registry.sql',
  ]),
  '0009': Object.freeze([
    '0009_assessment_saved_scenarios.sql',
    '0009_assessment_version_saved_scenarios.sql',
  ]),
});

function shouldIncludeMigration(fileName, env = process.env) {
  if (!migrationFilePattern.test(fileName)) {
    return false;
  }

  if (/_seed\.sql$/i.test(fileName) && env.INCLUDE_SEED_MIGRATIONS !== 'true') {
    return false;
  }

  return true;
}

export function parseMigrationFileName(fileName) {
  const match = migrationFilePattern.exec(fileName);

  if (!match?.groups) {
    throw new Error(`Invalid migration filename: ${fileName}. Expected <numeric_version>_<description>.sql`);
  }

  return {
    fileName,
    version: match.groups.version,
    description: match.groups.name,
  };
}

function compareVersionStrings(leftVersion, rightVersion) {
  const leftNumericVersion = BigInt(leftVersion);
  const rightNumericVersion = BigInt(rightVersion);

  if (leftNumericVersion < rightNumericVersion) {
    return -1;
  }

  if (leftNumericVersion > rightNumericVersion) {
    return 1;
  }

  if (leftVersion.length !== rightVersion.length) {
    return leftVersion.length - rightVersion.length;
  }

  return leftVersion.localeCompare(rightVersion, 'en', { sensitivity: 'base' });
}

export function compareMigrationFileNames(leftFileName, rightFileName) {
  const left = parseMigrationFileName(leftFileName);
  const right = parseMigrationFileName(rightFileName);
  const versionComparison = compareVersionStrings(left.version, right.version);

  if (versionComparison !== 0) {
    return versionComparison;
  }

  const legacyOrder = legacyDuplicateMigrationOrder[left.version];
  if (legacyOrder) {
    const leftIndex = legacyOrder.indexOf(left.fileName);
    const rightIndex = legacyOrder.indexOf(right.fileName);

    if (leftIndex !== -1 && rightIndex !== -1 && leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
  }

  return left.fileName < right.fileName ? -1 : left.fileName > right.fileName ? 1 : 0;
}

export function validateMigrationFiles(migrationFiles) {
  const versionGroups = new Map();

  for (const fileName of migrationFiles) {
    const { version } = parseMigrationFileName(fileName);
    const existingGroup = versionGroups.get(version) ?? [];
    existingGroup.push(fileName);
    versionGroups.set(version, existingGroup);
  }

  const duplicateVersionGroups = [...versionGroups.entries()]
    .filter(([, fileNames]) => fileNames.length > 1)
    .map(([version, fileNames]) => ({
      version,
      fileNames: [...fileNames].sort((left, right) => compareMigrationFileNames(left, right)),
    }))
    .sort((left, right) => compareVersionStrings(left.version, right.version));

  const unexpectedDuplicateVersionGroups = duplicateVersionGroups.filter(({ version, fileNames }) => {
    const expectedFileNames = legacyDuplicateMigrationOrder[version];
    if (!expectedFileNames) {
      return true;
    }

    return expectedFileNames.length !== fileNames.length
      || expectedFileNames.some((expectedFileName, index) => fileNames[index] !== expectedFileName);
  });

  if (unexpectedDuplicateVersionGroups.length > 0) {
    const duplicateSummary = unexpectedDuplicateVersionGroups
      .map(({ version, fileNames }) => `${version}: ${fileNames.join(', ')}`)
      .join('; ');

    throw new Error(
      `Duplicate migration version prefixes detected: ${duplicateSummary}. Historical duplicates are only allowed for the explicitly grandfathered legacy files. Create a new migration with the next unused version instead of reusing an existing prefix.`,
    );
  }

  return {
    duplicateVersionGroups,
    legacyDuplicateVersionGroups: duplicateVersionGroups.filter(({ version }) => Boolean(legacyDuplicateMigrationOrder[version])),
  };
}

export async function resolveMigrationFiles(migrationsDir, env = process.env) {
  const files = await readdir(migrationsDir, { withFileTypes: true });

  const migrationFiles = files
    .filter((entry) => entry.isFile() && shouldIncludeMigration(entry.name, env))
    .map((entry) => entry.name)
    .sort((left, right) => compareMigrationFileNames(left, right));

  const skippedSeedFiles = files
    .filter((entry) => entry.isFile() && /_seed\.sql$/i.test(entry.name) && !shouldIncludeMigration(entry.name, env))
    .map((entry) => entry.name)
    .sort((left, right) => compareMigrationFileNames(left, right));

  const { duplicateVersionGroups, legacyDuplicateVersionGroups } = validateMigrationFiles(migrationFiles);

  return {
    migrationFiles,
    skippedSeedFiles,
    duplicateVersionGroups,
    legacyDuplicateVersionGroups,
  };
}
