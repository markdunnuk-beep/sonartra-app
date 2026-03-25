import { IndividualIntelligenceResultView } from '@/components/results/IndividualIntelligenceResultView'
import { loadIndividualResultDetailById } from '@/lib/server/individual-result-detail'
import { currentUser } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function IndividualResultDetailPage({ params }: { params: { resultId: string } }) {
  const model = await loadIndividualResultDetailById(params.resultId)

  if (model.state === 'unauthenticated') {
    redirect('/sign-in')
  }

  const user = await currentUser()

  return (
    <div className="pt-2 sm:pt-4">
      <IndividualIntelligenceResultView model={model} firstName={user?.firstName ?? null} />
    </div>
  )
}
