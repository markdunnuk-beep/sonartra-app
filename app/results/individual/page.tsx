import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { AppShell } from '@/components/layout/AppShell'
import { IndividualIntelligenceResultView } from '@/components/results/IndividualIntelligenceResultView'
import { IndividualResultApiResponse } from '@/lib/server/individual-results'

function getBaseUrl() {
  const headerStore = headers()
  const host = headerStore.get('x-forwarded-host') ?? headerStore.get('host')
  const protocol = headerStore.get('x-forwarded-proto') ?? 'http'

  if (!host) {
    return process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  }

  return `${protocol}://${host}`
}

async function getLatestIndividualResults(): Promise<IndividualResultApiResponse> {
  try {
    const response = await fetch(`${getBaseUrl()}/api/individual-results/latest`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        cookie: headers().get('cookie') ?? '',
      },
    })

    const payload = (await response.json()) as IndividualResultApiResponse
    return payload
  } catch {
    return {
      ok: false,
      state: 'error',
      message: 'Unable to load the latest individual results right now.',
    }
  }
}

export default async function IndividualResultsPage() {
  const response = await getLatestIndividualResults()

  if (response.state === 'unauthenticated') {
    redirect('/sign-in')
  }

  return (
    <AppShell>
      <IndividualIntelligenceResultView response={response} />
    </AppShell>
  )
}
