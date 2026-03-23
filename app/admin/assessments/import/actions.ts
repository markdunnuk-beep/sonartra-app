'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  buildAdminAssessmentPackageImportRedirectTarget,
  normalizeAdminAssessmentPackageCreateOrAttachState,
  type AdminAssessmentPackageCreateOrAttachState,
} from '@/lib/admin/domain/assessment-management'
import { createOrAttachAdminAssessmentPackage } from '@/lib/admin/server/assessment-management'

export async function submitAdminAssessmentCreateOrAttachPackageAction(
  _previousState: AdminAssessmentPackageCreateOrAttachState,
  formData: FormData,
): Promise<AdminAssessmentPackageCreateOrAttachState> {
  const packageText = String(formData.get('packageText') ?? '')
  const intent = String(formData.get('intent') ?? 'review')
  const packageFile = formData.get('packageFile')
  const uploadedFile = packageFile instanceof File && packageFile.size > 0 ? packageFile : null
  const uploadedText = uploadedFile ? await uploadedFile.text() : ''
  const effectivePackageText = uploadedText || packageText

  const result = await createOrAttachAdminAssessmentPackage({
    packageText: effectivePackageText,
    sourceFilename: uploadedFile?.name ?? null,
    confirmation: intent === 'confirm' ? 'confirm' : undefined,
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return normalizeAdminAssessmentPackageCreateOrAttachState({
      status: result.code === 'review_required' ? 'review' : 'error',
      message: result.message,
      packageText: effectivePackageText,
      fieldErrors: result.fieldErrors,
      review: result.review,
    })
  }

  revalidatePath('/admin/assessments')
  if (result.assessmentId) {
    revalidatePath(`/admin/assessments/${result.assessmentId}`)
  }

  const redirectTarget = buildAdminAssessmentPackageImportRedirectTarget(result.assessmentId, result.versionLabel)
  if (redirectTarget) {
    redirect(redirectTarget)
  }

  return normalizeAdminAssessmentPackageCreateOrAttachState({
    status: 'success',
    message: result.message,
    packageText: effectivePackageText,
    review: result.review,
  })
}
