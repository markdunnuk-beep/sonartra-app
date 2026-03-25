import { NextResponse } from 'next/server';

import { CompleteAssessmentOutcomeResponse, CompleteAssessmentRequest, CompleteAssessmentResponse } from '@/lib/assessment-types';
import { logDatabaseError, queryDb } from '@/lib/db';
import { completeAssessmentWithResults } from '@/lib/server/assessment-completion';
import { markAssignmentCompletionProcessing, markAssignmentFailed, markAssignmentResultReady } from '@/lib/server/assessment-assignments';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';

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

export interface CompleteRouteDependencies {
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

function toOutcomeResponse(body: CompleteAssessmentResponse): CompleteAssessmentOutcomeResponse {
  if (!body.ok) {
    return body;
  }

  if (body.resultStatus === 'succeeded' && body.resultId) {
    return {
      ok: true,
      status: 'ready',
      assessmentId: body.assessmentId,
      resultId: body.resultId,
    };
  }

  if (body.resultStatus === 'failed') {
    return {
      ok: true,
      status: 'failed',
      assessmentId: body.assessmentId,
      failure: {
        code: 'RESULT_GENERATION_FAILED',
        message: body.warning?.message ?? 'Assessment was completed but result generation failed.',
      },
    };
  }

  return {
    ok: true,
    status: 'processing',
    assessmentId: body.assessmentId,
  };
}

export async function postCompleteAssessment(request: Request, dependencies: CompleteRouteDependencies = defaultDependencies) {
  let step = 'resolve_authenticated_user';
  let loggedAssessmentId: string | null = null;

  try {
    const appUser = await dependencies.resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<CompleteAssessmentRequest>;

    if (!body.assessmentId) {
      return NextResponse.json({ error: 'assessmentId is required.' }, { status: 400 });
    }

    const assessmentId = body.assessmentId;
    loggedAssessmentId = assessmentId;

    step = 'validate_assessment_ownership';
    const ownership = await dependencies.queryDb<{ id: string }>(
      `SELECT id
       FROM assessments
       WHERE id = $1 AND user_id = $2`,
      [assessmentId, appUser.dbUserId]
    );

    if (!ownership.rows[0]) {
      return NextResponse.json({ ok: false, error: 'Assessment not found.' }, { status: 404 });
    }

    step = 'complete_assessment_with_results';
    const result = await dependencies.completeAssessmentWithResults(assessmentId);

    if (result.body.ok) {
      await runAssignmentLifecycleUpdate('mark_completion_processing', assessmentId, async () => {
        await dependencies.markAssignmentCompletionProcessing(assessmentId);
      });

      if (result.body.resultStatus === 'succeeded') {
        await runAssignmentLifecycleUpdate('mark_result_ready', assessmentId, async () => {
          await dependencies.markAssignmentResultReady({ assessmentId, resultId: (result.body as { resultId: string }).resultId });
        });
      } else if (result.body.resultStatus === 'failed') {
        await runAssignmentLifecycleUpdate('mark_failed', assessmentId, async () => {
          await dependencies.markAssignmentFailed({ assessmentId, resultId: (result.body as { resultId: string }).resultId });
        });
      }
    }

    return NextResponse.json(toOutcomeResponse(result.body), { status: result.httpStatus });
  } catch (error) {
    const err = error instanceof Error ? error : new Error('Unknown completion error')
    console.error('[assessment.complete] unhandled route failure', {
      route: '/api/assessments/complete',
      assessmentId: loggedAssessmentId,
      step,
      message: err.message,
      stack: err.stack,
    })
    logDatabaseError('POST /api/assessments/complete failed.', error, { route: '/api/assessments/complete' });

    return NextResponse.json({ ok: false, error: 'Unable to complete assessment.' }, { status: 500 });
  }
}
