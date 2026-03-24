import { AppShell } from '@/components/layout/AppShell'
import { IndividualIntelligenceResultView } from '@/components/results/IndividualIntelligenceResultView'
import { getLatestIndividualResultForUser, IndividualResultApiResponse } from '@/lib/server/individual-results'
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'

export const dynamic = 'force-dynamic'

function normaliseStatePayload(model: IndividualResultApiResponse): IndividualResultApiResponse | { state: string; message?: string } {
  const knownStates = new Set(['unauthenticated', 'empty', 'in_progress', 'completed_processing', 'results_unavailable', 'ready', 'ready_v2', 'ready_hybrid', 'error'])
  if (knownStates.has(model.state)) {
    return model
  }

  return { state: 'unexpected', message: 'Received unsupported result state.' }
}

interface IndividualResultsPageProps {
  searchParams?: {
    definitionId?: string | string[]
  }
}

function getSearchParamValue(value: string | string[] | undefined): string | null {
  return Array.isArray(value) ? (value[0] ?? null) : (value ?? null)
}

export default async function IndividualResultsPage({ searchParams }: IndividualResultsPageProps) {
  const definitionId = getSearchParamValue(searchParams?.definitionId)
  const model = normaliseStatePayload(await getLatestIndividualResultForUser({ assessmentDefinitionId: definitionId }))

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
