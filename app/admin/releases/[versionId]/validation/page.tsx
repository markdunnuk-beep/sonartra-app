import { AdminValidationPreviewWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'

export default function AdminReleaseValidationPage({ params }: { params: { versionId: string } }) {
  return <AdminValidationPreviewWireframePage versionId={params.versionId} />
}
