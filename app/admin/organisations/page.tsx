import { AdminOrganisationsWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'
import { getAdminOrganisationRegistryData } from '@/lib/admin/server/organisation-registry'
import { mapOrganisationRegistryDtosToDomainData } from '@/lib/admin/server/organisation-registry-mappers'

export default async function AdminOrganisationsPage() {
  const organisations = await getAdminOrganisationRegistryData().catch((error) => {
    console.error('[admin-organisations-page] Failed to load organisation registry.', error)
    return []
  })
  const organisationRegistryData = mapOrganisationRegistryDtosToDomainData(organisations)

  return <AdminOrganisationsWireframePage organisationRegistryData={organisationRegistryData} />
}
