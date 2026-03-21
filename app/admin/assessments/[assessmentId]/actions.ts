'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { AdminAssessmentVersionMutationState } from '@/lib/admin/domain/assessment-management'
import { buildAdminAssessmentVersionMutationState } from '@/lib/admin/domain/assessment-management'
import {
  archiveAdminAssessmentVersion,
  createAdminAssessmentDraftVersion,
  publishAdminAssessmentVersion,
} from '@/lib/admin/server/assessment-management'

function revalidateAssessmentPaths(assessmentId: string) {
  revalidatePath('/admin/assessments')
  revalidatePath(`/admin/assessments/${assessmentId}`)
  revalidatePath('/admin/audit')
}

export async function submitAdminAssessmentCreateDraftVersionAction(
  _previousState: AdminAssessmentVersionMutationState,
  formData: FormData,
): Promise<AdminAssessmentVersionMutationState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const result = await createAdminAssessmentDraftVersion({
    assessmentId,
    versionLabel: String(formData.get('versionLabel') ?? ''),
    notes: String(formData.get('notes') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminAssessmentVersionMutationState(result.message, result.fieldErrors)
  }

  revalidateAssessmentPaths(assessmentId)
  redirect(`/admin/assessments/${assessmentId}?tab=versions&mutation=version-created`)
}

export async function submitAdminAssessmentPublishVersionAction(
  _previousState: AdminAssessmentVersionMutationState,
  formData: FormData,
): Promise<AdminAssessmentVersionMutationState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const result = await publishAdminAssessmentVersion({
    assessmentId,
    versionId: String(formData.get('versionId') ?? ''),
    expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminAssessmentVersionMutationState(result.message, result.fieldErrors)
  }

  revalidateAssessmentPaths(assessmentId)
  redirect(`/admin/assessments/${assessmentId}?tab=versions&mutation=version-published`)
}

export async function submitAdminAssessmentArchiveVersionAction(
  _previousState: AdminAssessmentVersionMutationState,
  formData: FormData,
): Promise<AdminAssessmentVersionMutationState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const result = await archiveAdminAssessmentVersion({
    assessmentId,
    versionId: String(formData.get('versionId') ?? ''),
    expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? ''),
    confirmation: formData.get('confirmation') === 'confirm' ? 'confirm' : undefined,
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminAssessmentVersionMutationState(result.message, result.fieldErrors)
  }

  revalidateAssessmentPaths(assessmentId)
  redirect(`/admin/assessments/${assessmentId}?tab=versions&mutation=version-archived`)
}
