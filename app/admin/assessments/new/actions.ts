'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { AdminAssessmentCreateState } from '@/lib/admin/domain/assessment-management'
import { buildAdminAssessmentMutationState } from '@/lib/admin/domain/assessment-management'
import { createAdminAssessment } from '@/lib/admin/server/assessment-management'

export async function submitAdminAssessmentCreateAction(
  _previousState: AdminAssessmentCreateState,
  formData: FormData,
): Promise<AdminAssessmentCreateState> {
  const result = await createAdminAssessment({
    name: String(formData.get('name') ?? ''),
    key: String(formData.get('key') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    category: String(formData.get('category') ?? ''),
    description: String(formData.get('description') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminAssessmentMutationState(result.message, result.fieldErrors)
  }

  revalidatePath('/admin/assessments')
  revalidatePath('/admin/audit')
  redirect(`/admin/assessments/${result.assessmentId}?mutation=created`)
}
