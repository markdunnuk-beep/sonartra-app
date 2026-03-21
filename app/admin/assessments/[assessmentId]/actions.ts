'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { AdminAssessmentPackageImportState, AdminAssessmentVersionMutationState } from '@/lib/admin/domain/assessment-management'
import { buildAdminAssessmentVersionMutationState } from '@/lib/admin/domain/assessment-management'
import type { AdminAssessmentSimulationActionState } from '@/lib/admin/domain/assessment-simulation'
import {
  archiveAdminAssessmentVersion,
  createAdminAssessmentDraftVersion,
  importAdminAssessmentPackage,
  publishAdminAssessmentVersion,
  simulateAdminAssessmentVersion,
} from '@/lib/admin/server/assessment-management'

function revalidateAssessmentPaths(assessmentId: string, versionLabel?: string) {
  revalidatePath('/admin/assessments')
  revalidatePath(`/admin/assessments/${assessmentId}`)
  if (versionLabel) {
    revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}`)
    revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}/import`)
    revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}/simulate`)
  }
  revalidatePath('/admin/audit')
}

export async function submitAdminAssessmentSimulationAction(
  _previousState: AdminAssessmentSimulationActionState,
  formData: FormData,
): Promise<AdminAssessmentSimulationActionState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const result = await simulateAdminAssessmentVersion({
    assessmentId,
    versionId,
    responsePayload: String(formData.get('responsePayload') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (result.ok) {
    revalidatePath('/admin/audit')
  }

  return result.state
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

export async function submitAdminAssessmentImportPackageAction(
  _previousState: AdminAssessmentPackageImportState,
  formData: FormData,
): Promise<AdminAssessmentPackageImportState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const expectedUpdatedAt = String(formData.get('expectedUpdatedAt') ?? '')
  const packageText = String(formData.get('packageText') ?? '')
  const packageFile = formData.get('packageFile')
  const uploadedFile = packageFile instanceof File && packageFile.size > 0 ? packageFile : null
  const uploadedText = uploadedFile ? await uploadedFile.text() : ''

  const result = await importAdminAssessmentPackage({
    assessmentId,
    versionId,
    expectedUpdatedAt,
    packageText: uploadedText || packageText,
    sourceFilename: uploadedFile?.name ?? null,
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return {
      status: 'error',
      message: result.message,
      fieldErrors: result.fieldErrors,
      validationResult: result.validationResult,
    }
  }

  revalidateAssessmentPaths(assessmentId, versionLabel)
  redirect(`/admin/assessments/${assessmentId}/versions/${versionLabel}/import?mutation=package-imported`)
}
