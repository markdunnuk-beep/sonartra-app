import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg'

const globalForDb = globalThis as unknown as { pool?: Pool }

const DEFAULT_LOCAL_DB_POOL_MAX = 10
const DEFAULT_PRODUCTION_DB_POOL_MAX = 2

type DatabaseErrorClassification =
  | 'configuration'
  | 'pool_exhaustion'
  | 'connectivity'
  | 'schema'
  | 'data'
  | 'unknown'

interface DatabaseErrorDiagnostics {
  classification: DatabaseErrorClassification
  code?: string
  message: string
  causeCode?: string
  causeMessage?: string
}

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

export class DatabaseQueryError extends Error {
  override readonly cause?: unknown

  constructor(message: string, cause?: unknown) {
    super(message)
    this.name = 'DatabaseQueryError'
    this.cause = cause
  }
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

function extractCause(error: unknown): unknown {
  if (!error || typeof error !== 'object' || !('cause' in error)) {
    return undefined
  }

  return (error as { cause?: unknown }).cause
}

function classifyDatabaseError(error: unknown): DatabaseErrorDiagnostics {
  const code = extractDatabaseErrorCode(error)
  const message = extractDatabaseErrorMessage(error)
  const cause = extractCause(error)
  const causeCode = extractDatabaseErrorCode(cause)
  const causeMessage = cause ? extractDatabaseErrorMessage(cause) : undefined
  const normalizedMessage = message.toLowerCase()
  const normalizedCauseMessage = causeMessage?.toLowerCase() ?? ''
  const combinedMessage = `${normalizedMessage} ${normalizedCauseMessage}`.trim()
  const effectiveCode = causeCode ?? code

  if (error instanceof DatabaseConfigurationError) {
    return { classification: 'configuration', code, message, causeCode, causeMessage }
  }

  if (
    effectiveCode === '53300' ||
    /max clients reached/.test(combinedMessage) ||
    /too many clients/.test(combinedMessage) ||
    /remaining connection slots are reserved/.test(combinedMessage) ||
    /connection pool exhausted/.test(combinedMessage)
  ) {
    return { classification: 'pool_exhaustion', code, message, causeCode, causeMessage }
  }

  if (
    effectiveCode === 'ECONNREFUSED' ||
    effectiveCode === 'ECONNRESET' ||
    effectiveCode === 'ENOTFOUND' ||
    effectiveCode === 'EHOSTUNREACH' ||
    effectiveCode === 'ETIMEDOUT' ||
    effectiveCode === '28P01' ||
    effectiveCode === '3D000' ||
    effectiveCode === '57P01' ||
    effectiveCode === '57P03' ||
    effectiveCode === '08001' ||
    effectiveCode === '08006' ||
    /tenant or user not found/.test(combinedMessage) ||
    /password authentication failed/.test(combinedMessage) ||
    /database .* does not exist/.test(combinedMessage) ||
    /connection terminated unexpectedly/.test(combinedMessage) ||
    /timeout expired/.test(combinedMessage) ||
    /connect econnrefused/.test(combinedMessage) ||
    /getaddrinfo enotfound/.test(combinedMessage)
  ) {
    return { classification: 'connectivity', code, message, causeCode, causeMessage }
  }

  if (
    effectiveCode === '42P01' ||
    effectiveCode === '42703' ||
    effectiveCode === '42601' ||
    /relation .* does not exist/.test(combinedMessage) ||
    /column .* does not exist/.test(combinedMessage) ||
    /syntax error/.test(combinedMessage)
  ) {
    return { classification: 'schema', code, message, causeCode, causeMessage }
  }

  if (
    effectiveCode === '22P02' ||
    effectiveCode === '23502' ||
    effectiveCode === '23503' ||
    effectiveCode === '23505' ||
    /violates/.test(combinedMessage) ||
    /invalid input syntax/.test(combinedMessage)
  ) {
    return { classification: 'data', code, message, causeCode, causeMessage }
  }

  return { classification: 'unknown', code, message, causeCode, causeMessage }
}

function buildDatabaseErrorMessage(operation: string, diagnostics: DatabaseErrorDiagnostics): string {
  switch (diagnostics.classification) {
    case 'configuration':
      return `${operation} because the database connection is not configured correctly.`
    case 'pool_exhaustion':
      return `${operation} because the database connection pool is saturated.`
    case 'connectivity':
      return `${operation} because the database connection is unavailable.`
    case 'schema':
      return `${operation} due to a database schema or query error.`
    case 'data':
      return `${operation} due to invalid or conflicting database data.`
    default:
      return `${operation} due to a database error.`
  }
}

function toDatabaseError(error: unknown, operation: string): DatabaseConfigurationError | DatabaseUnavailableError | DatabaseQueryError {
  if (error instanceof DatabaseConfigurationError || error instanceof DatabaseUnavailableError || error instanceof DatabaseQueryError) {
    return error
  }

  const diagnostics = classifyDatabaseError(error)
  const message = buildDatabaseErrorMessage(operation, diagnostics)

  if (diagnostics.classification === 'configuration') {
    return new DatabaseConfigurationError(message, error)
  }

  if (diagnostics.classification === 'pool_exhaustion' || diagnostics.classification === 'connectivity') {
    return new DatabaseUnavailableError(message, error)
  }

  return new DatabaseQueryError(message, error)
}

function parsePoolMaxValue(value: string | undefined): number | null {
  if (!value) {
    return null
  }

  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1) {
    return null
  }

  return parsed
}

export function resolveDatabasePoolMax(env: NodeJS.ProcessEnv = process.env): number {
  const configured = parsePoolMaxValue(env.DB_POOL_MAX)
  if (configured !== null) {
    return configured
  }

  return env.NODE_ENV === 'production' ? DEFAULT_PRODUCTION_DB_POOL_MAX : DEFAULT_LOCAL_DB_POOL_MAX
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL

  if (!connectionString) {
    throw new DatabaseConfigurationError('Database connection is not configured.')
  }

  return new Pool({
    connectionString,
    max: resolveDatabasePoolMax(process.env),
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

export function getDatabaseErrorDiagnostics(error: unknown): DatabaseErrorDiagnostics {
  return classifyDatabaseError(error)
}

export function logDatabaseError(context: string, error: unknown): void {
  const diagnostics = getDatabaseErrorDiagnostics(error)
  console.error(context, {
    classification: diagnostics.classification,
    code: diagnostics.code,
    message: diagnostics.message,
    causeCode: diagnostics.causeCode,
    causeMessage: diagnostics.causeMessage,
  })
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
      logDatabaseError('Database transaction rollback failed.', rollbackError)
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
