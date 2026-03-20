import { AdminUsersWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'
import { getAdminAccessRegistryData } from '@/lib/admin/server/access-registry'
import { mapAccessRegistryDtosToDomainData } from '@/lib/admin/server/access-registry-mappers'

export default async function AdminUsersPage() {
  const identities = await getAdminAccessRegistryData().catch((error) => {
    console.error('[admin-users-page] Failed to load access registry users.', error)
    return []
  })
  const accessRegistryData = mapAccessRegistryDtosToDomainData(identities)

  return <AdminUsersWireframePage accessRegistryData={accessRegistryData} />
}
