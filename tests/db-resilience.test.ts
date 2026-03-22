import assert from 'node:assert/strict'
import test from 'node:test'
import { pathToFileURL } from 'node:url'

function buildModuleUrl(relativePath: string): string {
  const moduleUrl = pathToFileURL(new URL(relativePath, import.meta.url).pathname)
  moduleUrl.searchParams.set('t', String(Date.now()))
  return moduleUrl.href
}

test('queryDb reports missing DATABASE_URL with a clear configuration error', async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL
  const originalPool = (globalThis as { pool?: unknown }).pool

  delete process.env.DATABASE_URL
  delete (globalThis as { pool?: unknown }).pool

  try {
    const dbModule = await import(buildModuleUrl('../lib/db.ts'))

    await assert.rejects(
      () => dbModule.queryDb('SELECT 1'),
      (error: unknown) => {
        assert(error instanceof dbModule.DatabaseConfigurationError)
        assert.match((error as Error).message, /database connection is not configured/i)
        return true
      },
    )
  } finally {
    if (originalDatabaseUrl) {
      process.env.DATABASE_URL = originalDatabaseUrl
    }
    else {
      delete process.env.DATABASE_URL
    }

    if (originalPool === undefined) {
      delete (globalThis as { pool?: unknown }).pool
    } else {
      ;(globalThis as { pool?: unknown }).pool = originalPool
    }
  }
})

test('resolveDatabasePoolMax uses safe production defaults and ignores invalid overrides', async () => {
  const dbModule = await import(buildModuleUrl('../lib/db.ts'))

  assert.equal(
    dbModule.resolveDatabasePoolMax({ NODE_ENV: 'production', DB_POOL_MAX: undefined } as NodeJS.ProcessEnv),
    2,
  )
  assert.equal(
    dbModule.resolveDatabasePoolMax({ NODE_ENV: 'development', DB_POOL_MAX: undefined } as NodeJS.ProcessEnv),
    10,
  )
  assert.equal(
    dbModule.resolveDatabasePoolMax({ NODE_ENV: 'production', DB_POOL_MAX: '1' } as NodeJS.ProcessEnv),
    1,
  )
  assert.equal(
    dbModule.resolveDatabasePoolMax({ NODE_ENV: 'production', DB_POOL_MAX: 'invalid' } as NodeJS.ProcessEnv),
    2,
  )
  assert.equal(
    dbModule.resolveDatabasePoolMax({ NODE_ENV: 'production', DB_POOL_MAX: '0' } as NodeJS.ProcessEnv),
    2,
  )
})

test('database error diagnostics classify pool exhaustion separately from schema failures', async () => {
  const dbModule = await import(buildModuleUrl('../lib/db.ts'))
  const poolError = new Error('MaxClientsInSessionMode: max clients reached - in Session mode max clients are limited to pool_size') as Error & { code?: string }
  poolError.code = '53300'

  const schemaError = new Error('relation "assessment_versions" does not exist') as Error & { code?: string }
  schemaError.code = '42P01'

  assert.deepEqual(dbModule.getDatabaseErrorDiagnostics(poolError), {
    classification: 'pool_exhaustion',
    code: '53300',
    message: 'MaxClientsInSessionMode: max clients reached - in Session mode max clients are limited to pool_size',
    causeCode: undefined,
    causeMessage: undefined,
  })
  assert.equal(
    dbModule.describeDatabaseError(poolError),
    'Database request failed because the database connection pool is saturated.',
  )
  assert.deepEqual(dbModule.getDatabaseErrorDiagnostics(schemaError), {
    classification: 'schema',
    code: '42P01',
    message: 'relation "assessment_versions" does not exist',
    causeCode: undefined,
    causeMessage: undefined,
  })
  assert.equal(
    dbModule.describeDatabaseError(schemaError),
    'Database request failed due to a database schema or query error.',
  )
})
