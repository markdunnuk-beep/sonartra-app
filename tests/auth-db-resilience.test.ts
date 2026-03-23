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

test('resolveAuthenticatedAppUser tolerates legacy users tables that do not expose profile columns', async () => {
  const authModule = await import('../lib/server/auth')

  const queryCalls: string[] = []
  const transactionCalls: string[] = []

  const resolved = await authModule.resolveAuthenticatedAppUser({
    auth: async () => ({ userId: 'clerk-user-1' }),
    currentUser: async () => ({
      primaryEmailAddress: { emailAddress: 'user@example.com' },
      emailAddresses: [{ emailAddress: 'user@example.com' }],
      firstName: 'Mark',
      lastName: 'Dunn',
    }) as never,
    queryDb: async (sql: string, params?: unknown[]) => {
      queryCalls.push(sql)

      if (/to_regclass\('users'\)/i.test(sql)) {
        return { rows: [{ users_schema: 'public' }] } as never
      }

      if (/information_schema\.columns/i.test(sql)) {
        assert.deepEqual(params, ['public'])
        return {
          rows: [
            { column_name: 'id' },
            { column_name: 'email' },
            { column_name: 'updated_at' },
          ],
        } as never
      }

      if (/where email = \$1/i.test(sql)) {
        assert.match(sql, /null::text as external_auth_id/i)
        assert.deepEqual(params, ['user@example.com'])
        return { rows: [] } as never
      }

      throw new Error(`Unexpected queryDb SQL: ${sql}`)
    },
    withTransaction: async (callback) =>
      callback({
        query: async (sql: string, params?: unknown[]) => {
          transactionCalls.push(sql)
          assert.match(sql, /insert into users \(email\)/i)
          assert.match(sql, /values \(\$1\)/i)
          assert.match(sql, /on conflict \(email\)/i)
          assert.match(sql, /do update set\s+updated_at = now\(\)/i)
          assert.match(sql, /returning id,\s+null::text as external_auth_id,\s+email/i)
          assert.deepEqual(params, ['user@example.com'])

          return {
            rows: [{ id: 'user-1', external_auth_id: null, email: 'user@example.com' }],
          } as never
        },
      } as never),
  })

  assert.equal(resolved?.dbUserId, 'user-1')
  assert.equal(resolved?.email, 'user@example.com')
  assert.equal(queryCalls.filter((sql) => /where email = \$1/i.test(sql)).length, 1)
  assert.equal(transactionCalls.length, 1)
})
