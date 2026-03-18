import AssessmentPageClient from './AssessmentPageClient'

import { resolveIndividualLifecycleState } from '@/lib/server/assessment-readiness'
import { redirect } from 'next/navigation'

interface AssessmentPageProps {
  searchParams?: {
    assessmentId?: string | string[]
  }
}

function getAssessmentId(searchParams: AssessmentPageProps['searchParams']): string | null {
  const rawAssessmentId = searchParams?.assessmentId
  const assessmentId = Array.isArray(rawAssessmentId) ? rawAssessmentId[0] : rawAssessmentId

  if (!assessmentId) {
    return null
  }

  return assessmentId
}

export default async function AssessmentPage({ searchParams }: AssessmentPageProps) {
  const requestedAssessmentId = getAssessmentId(searchParams)
  const resolved = await resolveIndividualLifecycleState()

  if (resolved.authState === 'unauthenticated') {
    redirect('/sign-in')
  }

  const canonicalAssessmentId = resolved.lifecycle.latestAssessment?.assessmentId ?? null

  return (
    <AssessmentPageClient
      initialAssessmentId={requestedAssessmentId}
      initialLifecycle={resolved.lifecycle}
      canonicalAssessmentId={canonicalAssessmentId}
    />
  )
}
