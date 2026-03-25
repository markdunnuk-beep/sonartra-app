import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { loadIndividualResultsViewModel } from '@/lib/server/individual-area'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function IndividualResultsPage() {
  const appUser = await resolveAuthenticatedAppUser()

  if (!appUser) {
    redirect('/sign-in')
  }

  const model = await loadIndividualResultsViewModel(appUser.dbUserId)

  return (
    <div className="space-y-4">
      {model.map((result) => (
        <Card key={result.resultId}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-textPrimary">{result.assessmentTitle}</h2>
              <p className="text-sm text-textSecondary">{result.summaryLabel}</p>
              <p className="text-xs uppercase tracking-[0.12em] text-textSecondary">State: {result.readinessState}</p>
            </div>
            <Button href={result.detailHref} variant="secondary">View detail</Button>
          </div>
        </Card>
      ))}
      {model.length === 0 ? (
        <Card>
          <p className="text-sm text-textSecondary">No persisted results are available yet.</p>
        </Card>
      ) : null}
    </div>
  )
}
