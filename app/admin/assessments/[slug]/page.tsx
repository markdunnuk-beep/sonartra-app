import { AdminAssessmentDetailWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'

export default function AdminAssessmentDetailPage({ params }: { params: { slug: string } }) {
  return <AdminAssessmentDetailWireframePage slug={params.slug} />
}
