import { AdminAssessmentVersionDetailWireframePage } from '@/components/admin/surfaces/AdminWireframeSurfaces'

export default function AdminAssessmentVersionDetailPage({ params }: { params: { slug: string; versionNumber: string } }) {
  return <AdminAssessmentVersionDetailWireframePage slug={params.slug} versionNumber={params.versionNumber} />
}
