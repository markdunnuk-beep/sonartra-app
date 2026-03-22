'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type {
  AdminAssessmentPackageImportState,
  AdminAssessmentScenarioImportState,
  AdminAssessmentScenarioSuiteRunState,
  AdminAssessmentVersionMutationState,
} from '@/lib/admin/domain/assessment-management'
import {
  buildAdminAssessmentPackageImportRedirectTarget,
  buildAdminAssessmentScenarioImportState,
  buildAdminAssessmentVersionMutationState,
  normalizeAdminAssessmentPackageImportState,
} from '@/lib/admin/domain/assessment-management'
import type { AdminAssessmentSimulationActionState } from '@/lib/admin/domain/assessment-simulation'
import {
  archiveAdminAssessmentVersion,
  cloneAdminAssessmentSavedScenario,
  createAdminAssessmentDraftVersion,
  importAdminAssessmentPackage,
  importAdminAssessmentSavedScenarios,
  publishAdminAssessmentVersion,
  refreshAdminAssessmentVersionReleaseReadiness,
  removeAdminAssessmentVersionSignOff,
  runAdminAssessmentScenarioSuite,
  signOffAdminAssessmentVersion,
  simulateAdminAssessmentVersion,
  updateAdminAssessmentVersionReleaseNotes,
} from '@/lib/admin/server/assessment-management'

function revalidateAssessmentPaths(assessmentId: string, versionLabel?: string) {
  revalidatePath('/admin/assessments')
  revalidatePath(`/admin/assessments/${assessmentId}`)
  if (versionLabel) {
    revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}`)
    revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}/import`)
    revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}/simulate`)
    revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}/report-preview`)
    revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}/scenarios`)
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

export async function submitAdminAssessmentScenarioImportAction(
  _previousState: AdminAssessmentScenarioImportState,
  formData: FormData,
): Promise<AdminAssessmentScenarioImportState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const result = await importAdminAssessmentSavedScenarios({
    assessmentId,
    targetVersionId: versionId,
    sourceVersionId: String(formData.get('sourceVersionId') ?? '') || null,
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  revalidateAssessmentPaths(assessmentId, versionLabel)

  if (!result.ok) {
    return buildAdminAssessmentScenarioImportState(result.message, {
      sourceVersionLabel: result.sourceVersionLabel,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      importedNames: result.importedNames,
      skipped: result.skipped,
    })
  }

  return {
    status: 'success',
    message: result.message,
    summary: {
      sourceVersionLabel: result.sourceVersionLabel,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      importedNames: result.importedNames,
      skipped: result.skipped,
    },
  }
}

export async function submitAdminAssessmentScenarioCloneAction(
  _previousState: AdminAssessmentScenarioImportState,
  formData: FormData,
): Promise<AdminAssessmentScenarioImportState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const result = await cloneAdminAssessmentSavedScenario({
    assessmentId,
    targetVersionId: versionId,
    sourceScenarioId: String(formData.get('sourceScenarioId') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  revalidateAssessmentPaths(assessmentId, versionLabel)

  if (!result.ok) {
    return buildAdminAssessmentScenarioImportState(result.message, {
      sourceVersionLabel: result.sourceVersionLabel,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      importedNames: result.importedNames,
      skipped: result.skipped,
    })
  }

  return {
    status: 'success',
    message: result.message,
    summary: {
      sourceVersionLabel: result.sourceVersionLabel,
      importedCount: result.importedCount,
      skippedCount: result.skippedCount,
      importedNames: result.importedNames,
      skipped: result.skipped,
    },
  }
}

export async function submitAdminAssessmentScenarioSuiteRunAction(
  _previousState: AdminAssessmentScenarioSuiteRunState,
  formData: FormData,
): Promise<AdminAssessmentScenarioSuiteRunState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const result = await runAdminAssessmentScenarioSuite({
    assessmentId,
    versionId,
    baselineVersionId: String(formData.get('baselineVersionId') ?? '') || null,
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  revalidateAssessmentPaths(assessmentId, versionLabel)

  if (!result.ok) {
    return { status: 'error', message: result.message, snapshot: result.snapshot ?? null }
  }

  return { status: 'success', message: result.message, snapshot: result.snapshot ?? null }
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


export async function submitAdminAssessmentRefreshReadinessAction(
  _previousState: AdminAssessmentVersionMutationState,
  formData: FormData,
): Promise<AdminAssessmentVersionMutationState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const result = await refreshAdminAssessmentVersionReleaseReadiness({ assessmentId, versionId })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  revalidateAssessmentPaths(assessmentId, versionLabel)
  return result.ok ? { status: 'success', message: result.message } : buildAdminAssessmentVersionMutationState(result.message, result.fieldErrors)
}

export async function submitAdminAssessmentSignOffAction(
  _previousState: AdminAssessmentVersionMutationState,
  formData: FormData,
): Promise<AdminAssessmentVersionMutationState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const result = await signOffAdminAssessmentVersion({ assessmentId, versionId })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  revalidateAssessmentPaths(assessmentId, versionLabel)
  return result.ok ? { status: 'success', message: result.message } : buildAdminAssessmentVersionMutationState(result.message, result.fieldErrors)
}

export async function submitAdminAssessmentRemoveSignOffAction(
  _previousState: AdminAssessmentVersionMutationState,
  formData: FormData,
): Promise<AdminAssessmentVersionMutationState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const result = await removeAdminAssessmentVersionSignOff({ assessmentId, versionId })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  revalidateAssessmentPaths(assessmentId, versionLabel)
  return result.ok ? { status: 'success', message: result.message } : buildAdminAssessmentVersionMutationState(result.message, result.fieldErrors)
}

export async function submitAdminAssessmentReleaseNotesAction(
  _previousState: AdminAssessmentVersionMutationState,
  formData: FormData,
): Promise<AdminAssessmentVersionMutationState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const result = await updateAdminAssessmentVersionReleaseNotes({
    assessmentId,
    versionId,
    releaseNotes: String(formData.get('releaseNotes') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  revalidateAssessmentPaths(assessmentId, versionLabel)
  return result.ok ? { status: 'success', message: result.message } : buildAdminAssessmentVersionMutationState(result.message, result.fieldErrors)
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
    return normalizeAdminAssessmentPackageImportState({
      status: 'error',
      message: result.message,
      fieldErrors: result.fieldErrors,
      validationResult: result.validationResult,
    })
  }

  revalidateAssessmentPaths(assessmentId, versionLabel)

  const redirectTarget = buildAdminAssessmentPackageImportRedirectTarget(assessmentId, versionLabel)
  if (redirectTarget) {
    redirect(redirectTarget)
  }

  console.error('[admin-assessment-import] Package import succeeded but redirect identifiers were missing.', {
    assessmentId,
    versionId,
    versionLabel,
    resultAssessmentId: result.assessmentId ?? null,
    resultVersionId: result.versionId ?? null,
  })

  return normalizeAdminAssessmentPackageImportState({
    status: 'success',
    message: 'Package imported successfully, but the page could not redirect because the assessment or version identifier was missing. Review the results below and refresh the page before continuing.',
    validationResult: result.validationResult,
  })
}
