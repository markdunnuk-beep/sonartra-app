import { EmptyState } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'

export default function AdminAssessmentNotFound() {
  return (
    <EmptyState
      title="Assessment not found"
      detail="The requested assessment record could not be found in the admin registry."
      action={<Button href="/admin/assessments" variant="secondary">Back to assessments</Button>}
    />
  )
}
