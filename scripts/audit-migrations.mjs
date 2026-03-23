import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { Client } from 'pg'
import { resolveMigrationFiles } from './migration-files.mjs'
import {
  DEFAULT_AUDIT_SCHEMA_NAME,
  DEFAULT_SCHEMA_SANITY_TABLES,
  analyzeMigrationAuditState,
  buildSchemaSanityReport,
} from './migration-audit-helpers.mjs'

const migrationsDir = path.join(process.cwd(), 'db', 'migrations')
const schemaMigrationsTableName = 'public.schema_migrations'

function parseArgs(argv, env = process.env) {
  const options = {
    schemaName: DEFAULT_AUDIT_SCHEMA_NAME,
    schemaSanity: false,
    targetLabel: env.MIGRATION_AUDIT_TARGET?.trim() || 'unspecified-target',
  }

  for (const arg of argv) {
    if (arg === '--schema-sanity') {
      options.schemaSanity = true
      continue
    }

    if (arg.startsWith('--schema=')) {
      options.schemaName = arg.slice('--schema='.length) || DEFAULT_AUDIT_SCHEMA_NAME
      continue
    }

    if (arg.startsWith('--target=')) {
      options.targetLabel = arg.slice('--target='.length) || options.targetLabel
      continue
    }

    throw new Error(`Unknown argument: ${arg}`)
  }

  return options
}

function formatList(items) {
  return items.length > 0 ? items.join(', ') : 'none'
}

function quoteIdentifier(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`
}

async function getAuditDiagnostics(client, schemaName) {
  const result = await client.query(
    `SELECT
       current_database() AS database_name,
       current_schema() AS schema_name,
       current_user AS database_user,
       current_setting('search_path') AS search_path,
       to_regclass('assessment_versions')::text AS assessment_versions_regclass,
       to_regclass($1)::text AS schema_migrations_regclass,
       EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = $2
           AND table_name = 'assessment_versions'
       ) AS assessment_versions_exists_in_schema,
       EXISTS (
         SELECT 1
         FROM information_schema.tables
         WHERE table_schema = 'public'
           AND table_name = 'schema_migrations'
       ) AS schema_migrations_exists_in_public
    `,
    [schemaMigrationsTableName, schemaName],
  )

  return result.rows[0] ?? null
}

async function loadRecordedMigrationRows(client) {
  const existsResult = await client.query(`SELECT to_regclass($1)::text AS regclass`, [schemaMigrationsTableName])
  const regclass = existsResult.rows[0]?.regclass ?? null

  if (regclass === null) {
    return {
      exists: false,
      rows: [],
    }
  }

  const result = await client.query(
    `SELECT id, applied_at
     FROM ${schemaMigrationsTableName}
     ORDER BY applied_at ASC NULLS LAST, id ASC`,
  )

  return {
    exists: true,
    rows: result.rows.map((row) => ({
      id: String(row.id),
      applied_at: row.applied_at instanceof Date ? row.applied_at.toISOString() : row.applied_at,
    })),
  }
}

async function loadSchemaSanitySnapshot(client, schemaName) {
  const tableResult = await client.query(
    `SELECT table_name
     FROM information_schema.tables
     WHERE table_schema = $1
       AND table_name = ANY($2::text[])
     ORDER BY table_name ASC`,
    [schemaName, DEFAULT_SCHEMA_SANITY_TABLES],
  )

  const existingTableNames = new Set(tableResult.rows.map((row) => String(row.table_name)))

  const columnResult = await client.query(
    `SELECT table_name, column_name
     FROM information_schema.columns
     WHERE table_schema = $1
       AND table_name = ANY($2::text[])
     ORDER BY table_name ASC, ordinal_position ASC`,
    [schemaName, DEFAULT_SCHEMA_SANITY_TABLES],
  )

  const columnsByTableName = new Map()
  for (const row of columnResult.rows) {
    const tableName = String(row.table_name)
    const columns = columnsByTableName.get(tableName) ?? []
    columns.push(String(row.column_name))
    columnsByTableName.set(tableName, columns)
  }

  const countsByTableName = new Map()
  for (const tableName of DEFAULT_SCHEMA_SANITY_TABLES) {
    if (!existingTableNames.has(tableName)) {
      continue
    }

    const qualifiedTableName = `${quoteIdentifier(schemaName)}.${quoteIdentifier(tableName)}`
    const countResult = await client.query(`SELECT COUNT(*)::bigint AS row_count FROM ${qualifiedTableName}`)
    countsByTableName.set(tableName, String(countResult.rows[0]?.row_count ?? '0'))
  }

  return {
    existingTableNames,
    columnsByTableName,
    countsByTableName,
  }
}

function printSchemaSanityReport(schemaSanityReport, countsByTableName) {
  console.log('Schema sanity:')
  for (const table of schemaSanityReport.tables) {
    const qualifiedName = `${table.schemaName}.${table.tableName}`
    const rowCount = countsByTableName.get(table.tableName)
    const status = table.isHealthy ? 'PASS' : 'FAIL'
    const countSummary = rowCount ? ` row_count=${rowCount}` : ''
    console.log(
      `  - [${status}] ${qualifiedName}: exists=${table.exists} missing_required_columns=${formatList(table.missingRequiredColumns)}${countSummary}`,
    )
  }
}

export async function runMigrationAudit(argv = process.argv.slice(2), env = process.env) {
  const options = parseArgs(argv, env)
  const connectionString = env.DATABASE_URL

  if (!connectionString) {
    throw new Error('DATABASE_URL is required. Set it before running the migration audit.')
  }

  const client = new Client({
    connectionString,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })

  await client.connect()

  let transactionStarted = false

  try {
    const { migrationFiles, skippedSeedFiles, legacyDuplicateVersionGroups } = await resolveMigrationFiles(migrationsDir, env)

    await client.query('BEGIN READ ONLY')
    transactionStarted = true

    const diagnostics = await getAuditDiagnostics(client, options.schemaName)
    const recordedMigrationSnapshot = await loadRecordedMigrationRows(client)
    const auditState = analyzeMigrationAuditState({
      migrationFiles,
      legacyDuplicateVersionGroups,
      recordedMigrationRows: recordedMigrationSnapshot.rows,
    })

    let schemaSanityReport = null
    let schemaSanitySnapshot = null
    if (options.schemaSanity) {
      schemaSanitySnapshot = await loadSchemaSanitySnapshot(client, options.schemaName)
      schemaSanityReport = buildSchemaSanityReport({
        schemaName: options.schemaName,
        existingTableNames: schemaSanitySnapshot.existingTableNames,
        columnsByTableName: schemaSanitySnapshot.columnsByTableName,
      })
    }

    await client.query('ROLLBACK')
    transactionStarted = false

    console.log(`Migration audit target: ${options.targetLabel}`)
    if (diagnostics) {
      console.log(
        `Connection: database=${diagnostics.database_name} current_schema=${diagnostics.schema_name} user=${diagnostics.database_user} search_path=${diagnostics.search_path}`,
      )
      console.log(
        `Resolved relations: assessment_versions=${diagnostics.assessment_versions_regclass ?? 'missing'} schema_migrations=${diagnostics.schema_migrations_regclass ?? 'missing'}`,
      )
    }
    console.log(`Source migrations (${migrationFiles.length}): ${formatList(migrationFiles)}`)
    console.log(`Skipped seed migrations (${skippedSeedFiles.length}): ${formatList(skippedSeedFiles)}`)
    console.log(
      `Grandfathered duplicate groups: ${legacyDuplicateVersionGroups.length > 0 ? legacyDuplicateVersionGroups.map(({ version, fileNames }) => `${version}=[${fileNames.join(' -> ')}]`).join(', ') : 'none'}`,
    )
    console.log(`Recorded schema_migrations rows (${recordedMigrationSnapshot.rows.length}): ${formatList(recordedMigrationSnapshot.rows.map((row) => row.id))}`)
    console.log(`Pending in DB (${auditState.pendingMigrationFiles.length}): ${formatList(auditState.pendingMigrationFiles)}`)
    console.log(`Recorded but missing from source (${auditState.recordedButMissingMigrationFiles.length}): ${formatList(auditState.recordedButMissingMigrationFiles)}`)
    console.log(
      `Recorded order anomalies by applied_at (${auditState.recordedOrderAnomalies.length}): ${auditState.recordedOrderAnomalies.length > 0 ? auditState.recordedOrderAnomalies.map((anomaly) => `${anomaly.previousId} -> ${anomaly.currentId}`).join(', ') : 'none'}`,
    )

    if (options.schemaSanity && schemaSanityReport && schemaSanitySnapshot) {
      printSchemaSanityReport(schemaSanityReport, schemaSanitySnapshot.countsByTableName)
    }

    const hasSchemaMigrationsFailure = !recordedMigrationSnapshot.exists
    const hasSchemaSanityFailures = schemaSanityReport?.hasFailures ?? false
    const hasFailures = hasSchemaMigrationsFailure || auditState.hasFailures || hasSchemaSanityFailures
    console.log(
      `Summary: ${hasFailures ? 'FAIL' : 'PASS'} (schema_migrations_present=${recordedMigrationSnapshot.exists} pending=${auditState.pendingMigrationFiles.length} missing_from_source=${auditState.recordedButMissingMigrationFiles.length} order_anomalies=${auditState.recordedOrderAnomalies.length}${options.schemaSanity ? ` schema_sanity_failures=${schemaSanityReport?.tables.filter((table) => !table.isHealthy).length ?? 0}` : ''})`,
    )

    if (hasFailures) {
      process.exitCode = 1
    }
  } finally {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK')
      } catch {
        // Ignore rollback errors during audit cleanup.
      }
    }

    await client.end()
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null
const isDirectExecution = invokedPath !== null && import.meta.url === pathToFileURL(invokedPath).href

if (isDirectExecution) {
  try {
    await runMigrationAudit()
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
