import { resolveAssessmentEntryRedirect } from '@/lib/server/assessment-entry-routing'
import { redirect } from 'next/navigation'

export default async function AssessmentEntryPage() {
  redirect(await resolveAssessmentEntryRedirect())
}
