import { redirect } from 'next/navigation'

interface LegacyIndividualResultsPageProps {
  searchParams?: {
    definitionId?: string | string[]
  }
}

function getSearchParamValue(value: string | string[] | undefined): string | null {
  const resolved = Array.isArray(value) ? value[0] : value
  return resolved ?? null
}

export default function LegacyIndividualResultsPage({ searchParams }: LegacyIndividualResultsPageProps) {
  // Transitional compatibility route: the new forward path is /individual/results.
  const definitionId = getSearchParamValue(searchParams?.definitionId)

  if (definitionId) {
    redirect(`/individual/results?definitionId=${encodeURIComponent(definitionId)}`)
  }

  redirect('/individual/results')
}
