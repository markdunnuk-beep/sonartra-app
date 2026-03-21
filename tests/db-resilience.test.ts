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
