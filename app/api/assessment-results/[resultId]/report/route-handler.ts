import { NextResponse } from 'next/server'

import { resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { getAssessmentReportArtifactForUser } from '@/lib/server/assessment-report-artifacts'

export interface AssessmentReportRouteDependencies {
  resolveAuthenticatedUser: typeof resolveAuthenticatedAppUser
  getArtifact: typeof getAssessmentReportArtifactForUser
}

const defaultDependencies: AssessmentReportRouteDependencies = {
  resolveAuthenticatedUser: resolveAuthenticatedAppUser,
  getArtifact: getAssessmentReportArtifactForUser,
}

export async function resolveAssessmentReportRoute(
  request: Request,
  params: { resultId: string },
  dependencies: AssessmentReportRouteDependencies = defaultDependencies,
) {
  const user = await dependencies.resolveAuthenticatedUser()
  if (!user) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 })
  }

  if (!params.resultId) {
    return NextResponse.json({ error: 'resultId is required.' }, { status: 400 })
  }

  const artifact = await dependencies.getArtifact({
    resultId: params.resultId,
    ownerUserId: user.dbUserId,
  })

  if (artifact.kind === 'not_found') {
    return NextResponse.json({ error: 'Report not found.' }, { status: 404 })
  }

  if (artifact.kind === 'forbidden') {
    return NextResponse.json({ error: 'Report access is forbidden.' }, { status: 403 })
  }

  if (artifact.kind === 'unavailable') {
    return NextResponse.json({
      ok: false,
      report: artifact.view,
      message: artifact.view.message,
    }, { status: 409 })
  }

  const isDownload = new URL(request.url).searchParams.get('download') === '1'
  return new NextResponse(artifact.body, {
    status: 200,
    headers: {
      'content-type': artifact.mediaType,
      'content-disposition': `${isDownload ? 'attachment' : 'inline'}; filename="${artifact.fileName}"`,
      'cache-control': 'private, no-store',
    },
  })
}
