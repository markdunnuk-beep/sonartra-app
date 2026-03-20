import { notFound } from 'next/navigation'
import { AdminUserDetailWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'
import { getAdminIdentityAuditHistory, getAdminIdentityById } from '@/lib/admin/server/access-registry'
import { mapAccessRegistryDtosToDomainData } from '@/lib/admin/server/access-registry-mappers'

export default async function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const identity = await getAdminIdentityById(params.id)

  if (!identity) {
    notFound()
  }

  const auditEvents = await getAdminIdentityAuditHistory(params.id).catch((error) => {
    console.error('[admin-user-detail-page] Failed to load access registry audit history.', { id: params.id, error })
    return []
  })
  const accessRegistryData = mapAccessRegistryDtosToDomainData([{ ...identity, auditEvents }])

  return <AdminUserDetailWireframePage userId={params.id} accessRegistryData={accessRegistryData} />
}
