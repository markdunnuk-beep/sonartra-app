import { AdminUserDetailWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  return <AdminUserDetailWireframePage userId={params.id} />
}
