import { DashboardPageView } from '@/components/dashboard/DashboardPageView'
import { getAuthenticatedDashboardState } from '@/lib/server/dashboard-state'
import { redirect } from 'next/navigation'

export default async function DashboardPage({ searchParams }: { searchParams?: { assessmentId?: string } }) {
  const state = await getAuthenticatedDashboardState({}, { activeAssessmentId: searchParams?.assessmentId ?? null })

  if (state.authStatus === 'unauthenticated') {
    redirect('/sign-in')
  }

  return <DashboardPageView state={state} />
}
