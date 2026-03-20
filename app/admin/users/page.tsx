import { AdminUsersWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'
import { getAdminAccessRegistryData } from '@/lib/admin/server/access-registry'
import { mapAccessRegistryDtosToDomainData } from '@/lib/admin/server/access-registry-mappers'

export default async function AdminUsersPage() {
  const identities = await getAdminAccessRegistryData()
  const accessRegistryData = mapAccessRegistryDtosToDomainData(identities)

  return <AdminUsersWireframePage accessRegistryData={accessRegistryData} />
}
