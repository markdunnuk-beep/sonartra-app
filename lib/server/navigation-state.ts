import { queryDb } from '@/lib/db';

interface ExistenceRow {
  has_completed_result: boolean;
}

export async function doesUserHaveCompletedResult(dbUserId: string): Promise<boolean> {
  const result = await queryDb<ExistenceRow>(
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
}
