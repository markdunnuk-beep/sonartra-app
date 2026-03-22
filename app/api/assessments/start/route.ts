import { NextResponse } from 'next/server'

import { logDatabaseError } from '@/lib/db'

import { startLiveSignalsAssessment } from '@/lib/server/start-live-signals-assessment'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'

export async function POST(request: Request) {
  try {
    const appUser = await resolveAuthenticatedAppUser()
    const body = (await request.json().catch(() => null)) as
      | {
          assessmentVersionKey?: string
          source?: string
        }
      | null

    const result = await startLiveSignalsAssessment({
      appUser,
      source: body?.source,
    })

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    logDatabaseError('POST /api/assessments/start failed.', error, { route: '/api/assessments/start' })

    return NextResponse.json({ error: 'Unable to start assessment.' }, { status: 500 })
  }
}
