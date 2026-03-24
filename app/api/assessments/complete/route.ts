import { NextResponse } from 'next/server';

import { CompleteAssessmentRequest } from '@/lib/assessment-types';
import { logDatabaseError, queryDb } from '@/lib/db';
import { completeAssessmentWithResults } from '@/lib/server/assessment-completion';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { markAssignmentCompletionProcessing, markAssignmentFailed, markAssignmentResultReady } from '@/lib/server/assessment-assignments';

async function runAssignmentLifecycleUpdate(step: 'mark_completion_processing' | 'mark_result_ready' | 'mark_failed', assessmentId: string, work: () => Promise<void>) {
  try {
    await work();
  } catch (error) {
    logDatabaseError(`[assessment.complete] assignment lifecycle update failed: ${step}`, error, {
      route: '/api/assessments/complete',
      assessmentId,
      step,
    });
  }
}

interface CompleteRouteDependencies {
  resolveAuthenticatedAppUser: typeof resolveAuthenticatedAppUser;
  queryDb: typeof queryDb;
  completeAssessmentWithResults: typeof completeAssessmentWithResults;
  markAssignmentCompletionProcessing: typeof markAssignmentCompletionProcessing;
  markAssignmentResultReady: typeof markAssignmentResultReady;
  markAssignmentFailed: typeof markAssignmentFailed;
}

const defaultDependencies: CompleteRouteDependencies = {
  resolveAuthenticatedAppUser,
  queryDb,
  completeAssessmentWithResults,
  markAssignmentCompletionProcessing,
  markAssignmentResultReady,
  markAssignmentFailed,
};

export async function postCompleteAssessment(request: Request, dependencies: CompleteRouteDependencies = defaultDependencies) {
  try {
    const appUser = await dependencies.resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CompleteAssessmentRequest>;

    if (!body.assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required.' }, { status: 400 });
    }

    const ownership = await dependencies.queryDb<{ id: string }>(
      `SELECT id
       FROM assessments
       WHERE id = $1 AND user_id = $2`,
      [body.assessmentId, appUser.dbUserId]
    );

    if (!ownership.rows[0]) {
      return NextResponse.json({ ok: false, error: 'Assessment not found.' }, { status: 404 });
    }

    const result = await dependencies.completeAssessmentWithResults(body.assessmentId);

    if (result.body.ok) {
      await runAssignmentLifecycleUpdate('mark_completion_processing', body.assessmentId, async () => {
        await dependencies.markAssignmentCompletionProcessing(body.assessmentId);
      });

      if (result.body.resultStatus === 'succeeded') {
        await runAssignmentLifecycleUpdate('mark_result_ready', body.assessmentId, async () => {
          await dependencies.markAssignmentResultReady({ assessmentId: body.assessmentId, resultId: result.body.resultId });
        });
      } else if (result.body.resultStatus === 'failed') {
        await runAssignmentLifecycleUpdate('mark_failed', body.assessmentId, async () => {
          await dependencies.markAssignmentFailed({ assessmentId: body.assessmentId, resultId: result.body.resultId });
        });
      }
    }

    return NextResponse.json(result.body, { status: result.httpStatus });
  } catch (error) {
    logDatabaseError('POST /api/assessments/complete failed.', error, { route: '/api/assessments/complete' });

    return NextResponse.json({ ok: false, error: 'Unable to complete assessment.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return postCompleteAssessment(request);
}
