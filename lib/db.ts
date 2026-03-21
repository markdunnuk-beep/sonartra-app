import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

const globalForDb = globalThis as unknown as { pool?: Pool }

export class DatabaseConfigurationError extends Error {
  override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'DatabaseConfigurationError'
    this.cause = cause
  }
}

export class DatabaseUnavailableError extends Error {
  override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'DatabaseUnavailableError'
    this.cause = cause
  }
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new DatabaseConfigurationError('Database connection is not configured.')
  }

  return new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  })
}

function getPool(): Pool {
  if (!globalForDb.pool) {
    globalForDb.pool = createPool()
  }

  return globalForDb.pool
}

function extractDatabaseErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object' || !('code' in error)) {
    return undefined
  }

  const code = (error as { code?: unknown }).code
  return typeof code === 'string' ? code : undefined
}

function extractDatabaseErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'Unknown database error.'
}

function toDatabaseError(error: unknown, operation: string): DatabaseConfigurationError | DatabaseUnavailableError {
  if (error instanceof DatabaseConfigurationError || error instanceof DatabaseUnavailableError) {
    return error
  }

  const code = extractDatabaseErrorCode(error)
  const rawMessage = extractDatabaseErrorMessage(error)
  const normalisedMessage = rawMessage.toLowerCase()

  const isConnectionFailure =
    code === 'ECONNREFUSED' ||
    code === 'ECONNRESET' ||
    code === 'ENOTFOUND' ||
    code === 'EHOSTUNREACH' ||
    code === 'ETIMEDOUT' ||
    code === '28P01' ||
    code === '3D000' ||
    code === '53300' ||
    code === '57P01' ||
    code === '57P03' ||
    code === '08001' ||
    code === '08006' ||
    /tenant or user not found/.test(normalisedMessage) ||
    /password authentication failed/.test(normalisedMessage) ||
    /database .* does not exist/.test(normalisedMessage) ||
    /connection terminated unexpectedly/.test(normalisedMessage) ||
    /timeout expired/.test(normalisedMessage) ||
    /connect econnrefused/.test(normalisedMessage) ||
    /getaddrinfo enotfound/.test(normalisedMessage)

  if (isConnectionFailure) {
    return new DatabaseUnavailableError(`${operation} because the database connection is unavailable.`, error)
  }

  return new DatabaseUnavailableError(`${operation} due to a database error.`, error)
}

export function describeDatabaseError(error: unknown): string {
  const wrappedError = toDatabaseError(error, 'Database request failed')
  return wrappedError.message
}

export function isDatabaseInfrastructureError(error: unknown): boolean {
  return error instanceof DatabaseConfigurationError || error instanceof DatabaseUnavailableError
}

export async function withTransaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  let client: PoolClient

  try {
    client = await getPool().connect()
  } catch (error) {
    throw toDatabaseError(error, 'Database transaction could not start')
  }

  try {
    await client.query('BEGIN')
    const result = await work(client)
    await client.query('COMMIT')

    return result
  } catch (error) {
    try {
      await client.query('ROLLBACK')
    } catch (rollbackError) {
      console.error('Database transaction rollback failed:', describeDatabaseError(rollbackError))
    }

    throw toDatabaseError(error, 'Database transaction failed')
  } finally {
    client.release()
  }
}

export async function queryDb<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[]
): Promise<QueryResult<T>> {
  try {
    return await getPool().query<T>(text, params)
  } catch (error) {
    throw toDatabaseError(error, 'Database query failed')
  }
}
