import { redirect } from 'next/navigation'

export default function AdminAssessmentVersionRedirectPage({ params }: { params: { assessmentId: string; versionNumber: string } }) {
  redirect(`/admin/assessments/${params.assessmentId}?tab=versions`)
}
