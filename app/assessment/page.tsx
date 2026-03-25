import { redirect } from 'next/navigation'

export default function AssessmentPageRedirect() {
  // Transitional compatibility route: the new forward path is /individual/assessments.
  redirect('/individual/assessments')
}
