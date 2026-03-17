import { NextResponse } from 'next/server';

import { AssessmentVersionRow } from '@/lib/assessment-types';
import { queryDb, withTransaction } from '@/lib/db';
import { resolveAuthenticatedAppUser } from '@/lib/server/auth';
import { traceAssessmentFlow } from '@/lib/assessment-flow-trace';

interface ExistingAssessmentRow {
  id: string;
}

export async function POST(request: Request) {
  try {
    const appUser = await resolveAuthenticatedAppUser();

    if (!appUser) {
      return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
    }

    const body = (await request.json()) as {
      assessmentVersionKey?: string;
      source?: string;
    };

    const assessmentVersionKey = body.assessmentVersionKey ?? 'wplp80-v1';

    traceAssessmentFlow('api.start.request', {
      userId: appUser.dbUserId,
      assessmentVersionKey,
      source: body.source ?? 'direct',
    });

    const versionResult = await queryDb<AssessmentVersionRow>(
      `SELECT id, key, name, total_questions, is_active
       FROM assessment_versions
       WHERE key = $1`,
      [assessmentVersionKey]
    );

    const version = versionResult.rows[0];

    if (!version || !version.is_active) {
      return NextResponse.json(
        { error: `No active assessment version found for key: ${assessmentVersionKey}.` },
        { status: 404 }
      );
    }

    const existingAssessment = await queryDb<ExistingAssessmentRow>(
      `SELECT id
       FROM assessments
       WHERE user_id = $1
         AND assessment_version_id = $2
         AND status IN ('not_started', 'in_progress')
       ORDER BY last_activity_at DESC NULLS LAST, created_at DESC
       LIMIT 1`,
      [appUser.dbUserId, version.id]
    );

    if (existingAssessment.rows[0]) {
      traceAssessmentFlow('api.start.resume-existing', {
        userId: appUser.dbUserId,
        assessmentId: existingAssessment.rows[0].id,
      });
      return NextResponse.json(
        {
          assessmentId: existingAssessment.rows[0].id,
          resumed: true,
          version: {
            id: version.id,
            key: version.key,
            name: version.name,
            totalQuestions: version.total_questions,
          },
        },
        { status: 200 }
      );
    }

    const result = await withTransaction(async (client) => {
      const created = await client.query<{ id: string }>(
        `INSERT INTO assessments (
          user_id,
          organisation_id,
          assessment_version_id,
          status,
          started_at,
          last_activity_at,
          progress_count,
          progress_percent,
          current_question_index,
          scoring_status,
          source
        ) VALUES ($1, NULL, $2, 'not_started', NOW(), NOW(), 0, 0, 0, 'not_scored', $3)
        RETURNING id`,
        [appUser.dbUserId, version.id, body.source ?? 'direct']
      );

      return created.rows[0];
    });

    traceAssessmentFlow('api.start.created', {
      userId: appUser.dbUserId,
      assessmentId: result.id,
    });

    return NextResponse.json(
      {
        assessmentId: result.id,
        resumed: false,
        version: {
          id: version.id,
          key: version.key,
          name: version.name,
          totalQuestions: version.total_questions,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/assessments/start failed:', error);

    return NextResponse.json({ error: 'Unable to start assessment.' }, { status: 500 });
  }
}
