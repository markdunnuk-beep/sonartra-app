import { Button } from '@/components/ui/Button'
import { EmptyState } from '@/components/admin/surfaces/AdminWireframePrimitives'

export default function AdminAssessmentVersionNotFound() {
  return (
    <EmptyState
      title="Assessment version not found"
      detail="The requested assessment version could not be found or no longer matches the current assessment context."
      action={<Button href="/admin/assessments" variant="secondary">Back to assessments</Button>}
    />
  )
}
