import AssessmentPageClient from './AssessmentPageClient'

import { loadLiveAssessmentRepositoryInventory } from '@/lib/server/assessment-repository-inventory'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function AssessmentPage() {
  const appUser = await resolveAuthenticatedAppUser()

  if (!appUser) {
    redirect('/sign-in')
  }

  const inventory = await loadLiveAssessmentRepositoryInventory(appUser.dbUserId)

  return <AssessmentPageClient inventory={inventory} />
}
