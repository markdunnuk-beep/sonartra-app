import { queryDb } from '@/lib/db';

interface ExistenceRow {
  has_completed_result: boolean;
}

interface NavigationStateDependencies {
  query: typeof queryDb;
}

const defaultDependencies: NavigationStateDependencies = {
  query: queryDb,
};

interface DbErrorLike {
  code?: string;
  detail?: string;
  hint?: string;
  message?: string;
}

function isMissingRelationError(error: unknown): boolean {
  return Boolean((error as DbErrorLike | null)?.code === '42P01');
}

export async function doesUserHaveCompletedResult(
  dbUserId: string,
  dependencies: NavigationStateDependencies = defaultDependencies
): Promise<boolean> {
  try {
    const result = await dependencies.query<ExistenceRow>(
      `SELECT EXISTS (
         SELECT 1
         FROM assessments a
         INNER JOIN assessment_results ar ON ar.assessment_id = a.id
         WHERE a.user_id = $1
           AND a.organisation_id IS NULL
           AND ar.status = 'complete'
       ) AS has_completed_result`,
      [dbUserId]
    );

    return Boolean(result.rows[0]?.has_completed_result);
  } catch (error) {
    if (!isMissingRelationError(error)) {
      throw error;
    }

    const dbError = error as DbErrorLike;

    console.error('[navigation-state] assessment_results table unavailable; defaulting to incomplete result gate', {
      appUserId: dbUserId,
      code: dbError?.code,
      message: dbError?.message,
      detail: dbError?.detail,
      hint: dbError?.hint,
    });

    return false;
  }
}
