import { AdminAuditWorkspaceSurface } from '@/components/admin/surfaces/AdminAuditWorkspaceSurface'
import { getAdminAuditWorkspaceData } from '@/lib/admin/server/audit-workspace'

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams?: {
    organisationId?: string
    actorId?: string
    entityType?: string
    entityId?: string
    eventType?: string
    dateFrom?: string
    dateTo?: string
    query?: string
    page?: string
  }
}) {
  const data = await getAdminAuditWorkspaceData(searchParams)

  return <AdminAuditWorkspaceSurface data={data} />
}
