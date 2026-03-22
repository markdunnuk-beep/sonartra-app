import AssessmentWorkspaceClient from './AssessmentWorkspaceClient'

import { resolveIndividualLifecycleState } from '@/lib/server/assessment-readiness'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface AssessmentWorkspacePageProps {
  searchParams?: {
    assessmentId?: string | string[]
  }
}

function getAssessmentId(searchParams: AssessmentWorkspacePageProps['searchParams']): string | null {
  const rawAssessmentId = searchParams?.assessmentId
  const assessmentId = Array.isArray(rawAssessmentId) ? rawAssessmentId[0] : rawAssessmentId

  if (!assessmentId) {
    return null
  }

  return assessmentId
}

export default async function AssessmentWorkspacePage({ searchParams }: AssessmentWorkspacePageProps) {
  const requestedAssessmentId = getAssessmentId(searchParams)
  const resolved = await resolveIndividualLifecycleState()

  if (resolved.authState === 'unauthenticated') {
    redirect('/sign-in')
  }

  const canonicalAssessmentId = resolved.lifecycle.latestAssessment?.assessmentId ?? null

  return (
    <AssessmentWorkspaceClient
      initialAssessmentId={requestedAssessmentId}
      initialLifecycle={resolved.lifecycle}
      canonicalAssessmentId={canonicalAssessmentId}
    />
  )
}
