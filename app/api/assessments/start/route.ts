import { NextResponse } from 'next/server';

import { queryDb, withTransaction } from '@/lib/db';
import { AssessmentVersionRow, StartAssessmentRequest } from '@/lib/assessment-types';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<StartAssessmentRequest>;

    if (!body.userId) {
      return NextResponse.json({ error: 'userId is required.' }, { status: 400 });
    }

    const assessmentVersionKey = body.assessmentVersionKey ?? 'wplp80-v1';

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
        ) VALUES ($1, $2, $3, 'not_started', NOW(), NOW(), 0, 0, 0, 'not_scored', $4)
        RETURNING id`,
        [body.userId, body.organisationId ?? null, version.id, body.source ?? 'direct']
      );

      return created.rows[0];
    });

    return NextResponse.json(
      {
        assessmentId: result.id,
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
