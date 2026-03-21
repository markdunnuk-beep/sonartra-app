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

export async function resolveAuthenticatedAppUser(
  dependencies: Partial<AuthDependencies> = {},
): Promise<AuthenticatedAppUser | null> {
  const deps = { ...defaultDependencies, ...dependencies }
  const { userId } = await deps.auth()

  if (!userId) {
    return null
  }

  let existingByExternalAuthId
  try {
    existingByExternalAuthId = await deps.queryDb<DbUserRow>(
      `SELECT id, external_auth_id, email
       FROM users
       WHERE external_auth_id = $1
       LIMIT 1`,
      [userId],
    )
  } catch (error) {
    logDatabaseUserResolutionFailure('lookup', userId, error)
    throw new DatabaseUserResolutionError('Database user resolution failed.', error)
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
      `SELECT id, external_auth_id, email
       FROM users
       WHERE email = $1
       LIMIT 1`,
      [emailAddress],
    )
  } catch (error) {
    logDatabaseUserResolutionFailure('email lookup', userId, error)
    throw new DatabaseUserResolutionError('Database user resolution failed.', error)
  }

  let upserted
  try {
    upserted = await deps.withTransaction(async (client) => {
      const result = await client.query<DbUserRow>(
        `INSERT INTO users (external_auth_id, email, first_name, last_name, account_type)
         VALUES ($1, $2, $3, $4, 'individual')
         ON CONFLICT (email)
         DO UPDATE SET
           external_auth_id = EXCLUDED.external_auth_id,
           first_name = COALESCE(EXCLUDED.first_name, users.first_name),
           last_name = COALESCE(EXCLUDED.last_name, users.last_name),
           updated_at = NOW()
         RETURNING id, external_auth_id, email`,
        [userId, emailAddress, firstName, lastName],
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
