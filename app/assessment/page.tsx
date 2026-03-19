import AssessmentPageClient from './AssessmentPageClient'

import { resolveIndividualLifecycleState } from '@/lib/server/assessment-readiness'
import { redirect } from 'next/navigation'

export default async function AssessmentPage() {
  const resolved = await resolveIndividualLifecycleState()

  if (resolved.authState === 'unauthenticated') {
    redirect('/sign-in')
  }

  return <AssessmentPageClient />
}
