import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { loadIndividualAssessmentsViewModel } from '@/lib/server/individual-area'
import { resolveAuthenticatedAppUser } from '@/lib/server/auth'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

function formatActionLabel(action: 'start' | 'resume' | 'view_status'): string {
  if (action === 'resume') return 'Resume'
  if (action === 'view_status') return 'View status'
  return 'Start'
}

export default async function IndividualAssessmentsPage() {
  const appUser = await resolveAuthenticatedAppUser()

  if (!appUser) {
    redirect('/sign-in')
  }

  const model = await loadIndividualAssessmentsViewModel(appUser.dbUserId)

  return (
    <div className="space-y-4">
      {model.map((assessment) => (
        <Card key={assessment.definitionId}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-textPrimary">{assessment.title}</h2>
              <p className="text-sm text-textSecondary">{assessment.description}</p>
              <p className="text-xs uppercase tracking-[0.12em] text-textSecondary">
                Attempt status: {assessment.attemptStatus.replaceAll('_', ' ')}
              </p>
            </div>
            <Button href={assessment.primaryActionHref ?? '/individual/results'} variant="primary">
              {formatActionLabel(assessment.nextPrimaryAction)}
            </Button>
          </div>
        </Card>
      ))}
      {model.length === 0 ? (
        <Card>
          <p className="text-sm text-textSecondary">No individual assessments are currently assigned.</p>
        </Card>
      ) : null}
    </div>
  )
}
