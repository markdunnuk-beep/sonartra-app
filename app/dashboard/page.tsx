import { DashboardPageView } from '@/components/dashboard/DashboardPageView'
import { getAuthenticatedDashboardState } from '@/lib/server/dashboard-state'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const state = await getAuthenticatedDashboardState()

  if (state.authStatus === 'unauthenticated') {
    redirect('/sign-in')
  }

  return <DashboardPageView state={state} />
}
