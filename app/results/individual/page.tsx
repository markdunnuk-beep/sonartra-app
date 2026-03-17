import { AppShell } from '@/components/layout/AppShell'
import { IndividualIntelligenceResultView } from '@/components/results/IndividualIntelligenceResultView'
import { getLatestIndividualResultForUser, IndividualResultApiResponse } from '@/lib/server/individual-results'
import { redirect } from 'next/navigation'
import { currentUser } from '@clerk/nextjs/server'

function normaliseStatePayload(model: IndividualResultApiResponse): IndividualResultApiResponse | { state: string; message?: string } {
  const knownStates = new Set(['unauthenticated', 'empty', 'incomplete', 'ready', 'error'])
  if (knownStates.has(model.state)) {
    return model
  }

  return { state: 'unexpected', message: 'Received unsupported result state.' }
}

export default async function IndividualResultsPage() {
  const model = normaliseStatePayload(await getLatestIndividualResultForUser())

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
