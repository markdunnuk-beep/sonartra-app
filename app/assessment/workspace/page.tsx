import AssessmentWorkspaceClient from './AssessmentWorkspaceClient'

import { resolveIndividualLifecycleState } from '@/lib/server/assessment-readiness'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

interface AssessmentWorkspacePageProps {
  searchParams?: {
    assessmentId?: string | string[]
    definitionId?: string | string[]
  }
}

function getSearchParamValue(value: string | string[] | undefined): string | null {
  const resolved = Array.isArray(value) ? value[0] : value
  return resolved ?? null
}

export default async function AssessmentWorkspacePage({ searchParams }: AssessmentWorkspacePageProps) {
  const requestedAssessmentId = getSearchParamValue(searchParams?.assessmentId)
  const requestedDefinitionId = getSearchParamValue(searchParams?.definitionId)
  const resolved = await resolveIndividualLifecycleState({ definitionId: requestedDefinitionId })

  if (resolved.authState === 'unauthenticated') {
    redirect('/sign-in')
  }

  const canonicalAssessmentId = resolved.lifecycle.latestAssessment?.assessmentId ?? null

  return (
    <AssessmentWorkspaceClient
      initialAssessmentId={requestedAssessmentId}
      initialDefinitionId={requestedDefinitionId}
      initialLifecycle={resolved.lifecycle}
      canonicalAssessmentId={canonicalAssessmentId}
    />
  )
}
