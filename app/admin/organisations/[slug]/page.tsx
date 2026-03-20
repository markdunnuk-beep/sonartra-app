import { AdminOrganisationDetailWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'

export default function AdminOrganisationDetailPage({ params }: { params: { slug: string } }) {
  return <AdminOrganisationDetailWireframePage slug={params.slug} />
}
