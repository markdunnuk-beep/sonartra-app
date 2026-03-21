import assert from 'node:assert/strict'
import test from 'node:test'

test('resolveAuthenticatedAppUser rethrows a clean error when database lookup fails', async () => {
  const dbModule = await import('../lib/db')

  const authModule = await import('../lib/server/auth')

  await assert.rejects(
    () =>
      authModule.resolveAuthenticatedAppUser({
        auth: async () => ({ userId: 'clerk-user-1' }),
        queryDb: async () => {
          throw new dbModule.DatabaseUnavailableError('Database query failed because the database connection is unavailable.')
        },
      }),
    (error: unknown) => {
      assert(error instanceof authModule.DatabaseUserResolutionError)
      assert.match((error as Error).message, /database user resolution failed/i)
      return true
    },
  )
})
