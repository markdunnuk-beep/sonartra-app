import { AppShell } from '@/components/layout/AppShell'
import { IndividualIntelligenceResultView } from '@/components/results/IndividualIntelligenceResultView'
import { getLatestIndividualResultForUser, IndividualResultApiResponse } from '@/lib/server/individual-results'
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'
interface IndividualResultsPageProps {
  searchParams?: {
    definitionId?: string | string[]
  }
}

function getSearchParamValue(value: string | string[] | undefined): string | null {
  const resolved = Array.isArray(value) ? value[0] : value
  return resolved ?? null
}

function normaliseStatePayload(model: IndividualResultApiResponse): IndividualResultApiResponse | { state: string; message?: string } {
  const knownStates = new Set(['unauthenticated', 'empty', 'in_progress', 'completed_processing', 'results_unavailable', 'ready', 'ready_v2', 'ready_hybrid', 'error'])
  if (knownStates.has(model.state)) {
    return model
  }

  return { state: 'unexpected', message: 'Received unsupported result state.' }
}

export default async function IndividualResultsPage({ searchParams }: IndividualResultsPageProps) {
  const requestedDefinitionId = getSearchParamValue(searchParams?.definitionId)
  const model = normaliseStatePayload(await getLatestIndividualResultForUser({ definitionId: requestedDefinitionId }))

  if (model.state === 'unauthenticated') {
    redirect('/sign-in')
  }

  const user = await currentUser()

  return (
    <AppShell>
      <div className="pt-4 sm:pt-6">
        <IndividualIntelligenceResultView model={model} firstName={user?.firstName ?? null} />
      </div>
    </AppShell>
  )
}
