import { NextResponse } from 'next/server'

import { startLiveSignalsAssessment } from '@/lib/server/start-live-signals-assessment'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'

export async function POST(request: Request) {
  try {
    const appUser = await resolveAuthenticatedAppUser()
    const body = (await request.json()) as {
      assessmentVersionKey?: string
      source?: string
    }
  }

  const existingAssessment = await deps.queryDb(
    `SELECT
       a.id,
       av.id AS assessment_version_id,
       av.key AS assessment_version_key,
       av.name AS assessment_version_name,
       av.total_questions
     FROM assessments a
     INNER JOIN assessment_versions av ON av.id = a.assessment_version_id
     WHERE a.user_id = $1
       AND av.assessment_definition_id = $2
       AND a.status IN ('not_started', 'in_progress')
     ORDER BY a.last_activity_at DESC NULLS LAST, a.created_at DESC
     LIMIT 1`,
    [appUser.dbUserId, version.assessmentDefinitionId],
  )

    const result = await startLiveSignalsAssessment({
      appUser,
      source: body.source,
    })

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('POST /api/assessments/start failed:', error)

    return NextResponse.json({ error: 'Unable to start assessment.' }, { status: 500 })
  }
}
