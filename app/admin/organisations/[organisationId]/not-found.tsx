import { EmptyState } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'

export default function AdminOrganisationNotFound() {
  return (
    <div className="py-8">
      <EmptyState
        title="Organisation not found"
        detail="The requested organisation record does not exist or is no longer available in the admin registry."
        action={<Button href="/admin/organisations" variant="secondary">Back to organisations</Button>}
      />
    </div>
  )
}
