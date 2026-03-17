import AssessmentPageClient from './AssessmentPageClient'

interface AssessmentPageProps {
  searchParams?: {
    assessmentId?: string | string[]
  }
}

function getAssessmentId(searchParams: AssessmentPageProps['searchParams']): string | null {
  const rawAssessmentId = searchParams?.assessmentId
  const assessmentId = Array.isArray(rawAssessmentId) ? rawAssessmentId[0] : rawAssessmentId

  if (!assessmentId) {
    return null
  }

  return assessmentId
}

export default function AssessmentPage({ searchParams }: AssessmentPageProps) {
  const initialAssessmentId = getAssessmentId(searchParams)

  return <AssessmentPageClient initialAssessmentId={initialAssessmentId} />
}
