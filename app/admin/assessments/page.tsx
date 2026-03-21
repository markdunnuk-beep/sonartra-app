import { AdminAssessmentsRegistrySurface } from '@/components/admin/surfaces/AdminAssessmentsRegistrySurface'
import { getAdminAssessmentRegistryData } from '@/lib/admin/server/assessment-management'

export default async function AdminAssessmentsPage({
  searchParams,
}: {
  searchParams?: {
    query?: string
    lifecycle?: string
    category?: string
    sort?: string
    page?: string
  }
}) {
  const data = await getAdminAssessmentRegistryData(searchParams)

  return <AdminAssessmentsRegistrySurface data={data} />
}
