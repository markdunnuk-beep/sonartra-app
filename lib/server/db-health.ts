import { describeDatabaseError, queryDb } from '@/lib/db'

export type DbHealthCheckResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable'; message: string }

export async function checkDatabaseHealth(): Promise<DbHealthCheckResult> {
  try {
    await queryDb('SELECT 1')
    return { ok: true }
  } catch (error) {
    return {
      ok: false,
      reason: 'unavailable',
      message: describeDatabaseError(error),
    }
  }
}
