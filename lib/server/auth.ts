import { auth, currentUser } from '@clerk/nextjs/server'

import { describeDatabaseError, queryDb, withTransaction } from '@/lib/db'

interface DbUserRow {
  id: string
  external_auth_id: string | null
  email: string
}

export interface AuthenticatedAppUser {
  clerkUserId: string
  dbUserId: string
  email: string
}

interface AuthDependencies {
  auth: () => Promise<{ userId: string | null }>
  currentUser: () => ReturnType<typeof currentUser>
  queryDb: typeof queryDb
  withTransaction: typeof withTransaction
}

interface UsersTableCapabilities {
  hasUsersTable: boolean
  usersSchema: string | null
  columns: Set<string>
}

export class DatabaseUserResolutionError extends Error {
  override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'DatabaseUserResolutionError'
    this.cause = cause
  }
}

function logDatabaseUserResolutionFailure(step: string, clerkUserId: string, error: unknown) {
  console.error(
    `resolveAuthenticatedAppUser database ${step} failed for Clerk user ${clerkUserId}: ${describeDatabaseError(error)}`,
  )
}

function logAuthResolutionEvent(event: string, metadata: Record<string, string | null | undefined>) {
  console.info('auth.resolve', {
    event,
    ...metadata,
  })
}

const defaultDependencies: AuthDependencies = {
  auth: async () => auth(),
  currentUser: async () => currentUser(),
  queryDb,
  withTransaction,
}

async function getUsersTableCapabilities(deps: Pick<AuthDependencies, 'queryDb'>): Promise<UsersTableCapabilities> {
  const tableResult = await deps.queryDb<{ users_schema: string | null }>(
    `select (
       select n.nspname
       from pg_class c
       inner join pg_namespace n on n.oid = c.relnamespace
       where c.oid = to_regclass('users')
     ) as users_schema`,
  )

  const usersSchema = tableResult.rows[0]?.users_schema ?? null
  if (!usersSchema) {
    return {
      hasUsersTable: false,
      usersSchema: null,
      columns: new Set<string>(),
    }
  }

  const columnResult = await deps.queryDb<{ column_name: string | null }>(
    `select column_name
     from information_schema.columns
     where table_schema = $1
       and table_name = 'users'`,
    [usersSchema],
  )

  return {
    hasUsersTable: true,
    usersSchema,
    columns: new Set((columnResult.rows ?? []).flatMap((row) => row.column_name ? [row.column_name] : [])),
  }
}

function buildUserSelectSql(usersTableCapabilities: UsersTableCapabilities, whereClause: string): string {
  const hasExternalAuthId = usersTableCapabilities.columns.has('external_auth_id')

  return `SELECT id, ${hasExternalAuthId ? 'external_auth_id' : 'NULL::text AS external_auth_id'}, email
       FROM users
       WHERE ${whereClause}
       LIMIT 1`
}

function buildUserUpsertSql(
  usersTableCapabilities: UsersTableCapabilities,
  values: {
    clerkUserId: string
    emailAddress: string
    firstName: string | null
    lastName: string | null
  },
): { sql: string; params: unknown[] } {
  const columns: string[] = []
  const params: unknown[] = []
  const placeholders: string[] = []
  const updateAssignments: string[] = ['updated_at = NOW()']

  const pushColumnValue = (columnName: string, value: unknown, updateClause?: string) => {
    columns.push(columnName)
    params.push(value)
    const placeholder = `$${params.length}`
    placeholders.push(placeholder)
    if (updateClause) {
      updateAssignments.push(updateClause.replaceAll('$value', placeholder))
    }
  }

  pushColumnValue('email', values.emailAddress)

  if (usersTableCapabilities.columns.has('external_auth_id')) {
    pushColumnValue('external_auth_id', values.clerkUserId, 'external_auth_id = $value')
  }

  if (usersTableCapabilities.columns.has('first_name')) {
    pushColumnValue('first_name', values.firstName, 'first_name = COALESCE($value, users.first_name)')
  }

  if (usersTableCapabilities.columns.has('last_name')) {
    pushColumnValue('last_name', values.lastName, 'last_name = COALESCE($value, users.last_name)')
  }

  if (usersTableCapabilities.columns.has('account_type')) {
    pushColumnValue('account_type', 'individual')
  }

  return {
    sql: `INSERT INTO users (${columns.join(', ')})
         VALUES (${placeholders.join(', ')})
         ON CONFLICT (email)
         DO UPDATE SET
           ${updateAssignments.join(', ')}
         RETURNING id, ${usersTableCapabilities.columns.has('external_auth_id') ? 'external_auth_id' : 'NULL::text AS external_auth_id'}, email`,
    params,
  }
}

export async function resolveAuthenticatedAppUser(
  dependencies: Partial<AuthDependencies> = {},
): Promise<AuthenticatedAppUser | null> {
  const deps = { ...defaultDependencies, ...dependencies }
  const { userId } = await deps.auth()

  if (!userId) {
    return null
  }

  let usersTableCapabilities
  try {
    usersTableCapabilities = await getUsersTableCapabilities(deps)
  } catch (error) {
    logDatabaseUserResolutionFailure('schema capability check', userId, error)
    throw new DatabaseUserResolutionError('Database user resolution failed.', error)
  }

  let existingByExternalAuthId
  if (usersTableCapabilities.columns.has('external_auth_id')) {
    try {
      existingByExternalAuthId = await deps.queryDb<DbUserRow>(
        buildUserSelectSql(usersTableCapabilities, 'external_auth_id = $1'),
        [userId],
      )
    } catch (error) {
      logDatabaseUserResolutionFailure('lookup', userId, error)
      throw new DatabaseUserResolutionError('Database user resolution failed.', error)
    }
  } else {
    existingByExternalAuthId = { rows: [] as DbUserRow[] }
    console.warn('resolveAuthenticatedAppUser skipped external_auth_id lookup because users.external_auth_id is unavailable.')
  }

  if (existingByExternalAuthId.rows[0]) {
    const matchedUser = existingByExternalAuthId.rows[0]

    logAuthResolutionEvent('matched_by_external_auth_id', {
      clerkUserId: userId,
      dbUserId: matchedUser.id,
      email: matchedUser.email,
    })

    return {
      clerkUserId: userId,
      dbUserId: matchedUser.id,
      email: matchedUser.email,
    }
  }

  const clerkUser = await deps.currentUser()
  const emailAddress =
    clerkUser?.primaryEmailAddress?.emailAddress ?? clerkUser?.emailAddresses?.[0]?.emailAddress

  if (!emailAddress) {
    throw new Error('Authenticated Clerk user is missing an email address.')
  }

  const firstName = clerkUser?.firstName ?? null
  const lastName = clerkUser?.lastName ?? null

  let existingByEmail
  try {
    existingByEmail = await deps.queryDb<DbUserRow>(
      buildUserSelectSql(usersTableCapabilities, 'email = $1'),
      [emailAddress],
    )
  } catch (error) {
    logDatabaseUserResolutionFailure('email lookup', userId, error)
    throw new DatabaseUserResolutionError('Database user resolution failed.', error)
  }

  let upserted
  try {
    upserted = await deps.withTransaction(async (client) => {
      const { sql, params } = buildUserUpsertSql(usersTableCapabilities, {
        clerkUserId: userId,
        emailAddress,
        firstName,
        lastName,
      })
      const result = await client.query<DbUserRow>(
        sql,
        params,
      )

      return result.rows[0]
    })
  } catch (error) {
    logDatabaseUserResolutionFailure('upsert', userId, error)
    throw new DatabaseUserResolutionError('Database user resolution failed.', error)
  }

  if (existingByEmail.rows[0]) {
    logAuthResolutionEvent('reconciled_by_email_upsert', {
      clerkUserId: userId,
      dbUserId: upserted.id,
      email: upserted.email,
    })
  } else {
    logAuthResolutionEvent('created_new_user', {
      clerkUserId: userId,
      dbUserId: upserted.id,
      email: upserted.email,
    })
  }

  return {
    clerkUserId: userId,
    dbUserId: upserted.id,
    email: upserted.email,
  }
}
