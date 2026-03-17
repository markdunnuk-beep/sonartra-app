import { AppShell } from '@/components/layout/AppShell'
import { IndividualIntelligenceResultView } from '@/components/results/IndividualIntelligenceResultView'
import { getAuthenticatedIndividualIntelligenceResult } from '@/lib/server/individual-intelligence-result'
import { redirect } from 'next/navigation'

export default async function IndividualResultsPage() {
  const model = await getAuthenticatedIndividualIntelligenceResult()

  if (model.resultStatus === 'unauthenticated') {
    redirect('/sign-in')
  }

  return (
    <AppShell>
      <IndividualIntelligenceResultView model={model} />
    </AppShell>
  )
}
