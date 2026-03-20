import { AdminPublishControlWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'

export default function AdminReleasePublishPage({ params }: { params: { versionId: string } }) {
  return <AdminPublishControlWireframePage versionId={params.versionId} />
}
