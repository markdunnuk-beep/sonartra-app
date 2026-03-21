'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import {
  archiveAdminAssessmentScenario,
  createOrUpdateAdminAssessmentScenario,
  runAdminAssessmentRegressionSuite,
  runAdminAssessmentScenario,
} from '@/lib/admin/server/assessment-regression'
import type { AdminAssessmentRegressionSuiteSummary, AdminAssessmentScenarioRegressionResult } from '@/lib/admin/domain/assessment-regression'

export interface AdminAssessmentScenarioEditorState {
  status: 'idle' | 'success' | 'error'
  message?: string
  fieldErrors?: {
    name?: string
    scenarioType?: string
    sampleResponsePayload?: string
  }
}

export interface AdminAssessmentScenarioRunState {
  status: 'idle' | 'success' | 'error'
  message?: string
  result?: AdminAssessmentScenarioRegressionResult
}

export interface AdminAssessmentRegressionSuiteState {
  status: 'idle' | 'success' | 'error'
  message?: string
  suite?: AdminAssessmentRegressionSuiteSummary
}

function revalidateScenarioPaths(assessmentId: string, versionLabel: string) {
  revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}`)
  revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}/simulate`)
  revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}/report-preview`)
  revalidatePath(`/admin/assessments/${assessmentId}/versions/${versionLabel}/scenarios`)
  revalidatePath('/admin/audit')
}

export async function submitAdminAssessmentScenarioSaveAction(
  _previousState: AdminAssessmentScenarioEditorState,
  formData: FormData,
): Promise<AdminAssessmentScenarioEditorState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const result = await createOrUpdateAdminAssessmentScenario({
    assessmentId,
    versionId,
    scenarioId: String(formData.get('scenarioId') ?? '') || null,
    name: String(formData.get('name') ?? ''),
    description: String(formData.get('description') ?? ''),
    scenarioType: String(formData.get('scenarioType') ?? ''),
    locale: String(formData.get('locale') ?? ''),
    sampleResponsePayload: String(formData.get('sampleResponsePayload') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return { status: 'error', message: result.message, fieldErrors: result.fieldErrors }
  }

  revalidateScenarioPaths(assessmentId, versionLabel)
  return { status: 'success', message: result.message }
}

export async function submitAdminAssessmentScenarioArchiveAction(
  _previousState: AdminAssessmentScenarioEditorState,
  formData: FormData,
): Promise<AdminAssessmentScenarioEditorState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const versionLabel = String(formData.get('versionLabel') ?? '')
  const scenarioId = String(formData.get('scenarioId') ?? '')
  const result = await archiveAdminAssessmentScenario({ assessmentId, versionId, scenarioId })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return { status: 'error', message: result.message }
  }

  revalidateScenarioPaths(assessmentId, versionLabel)
  return { status: 'success', message: result.message }
}

export async function submitAdminAssessmentScenarioRunAction(
  _previousState: AdminAssessmentScenarioRunState,
  formData: FormData,
): Promise<AdminAssessmentScenarioRunState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const scenarioId = String(formData.get('scenarioId') ?? '')
  const result = await runAdminAssessmentScenario({ assessmentId, versionId, scenarioId })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return { status: 'error', message: result.message }
  }

  return { status: 'success', message: result.message, result: result.result ?? undefined }
}

export async function submitAdminAssessmentRegressionSuiteRunAction(
  _previousState: AdminAssessmentRegressionSuiteState,
  formData: FormData,
): Promise<AdminAssessmentRegressionSuiteState> {
  const assessmentId = String(formData.get('assessmentId') ?? '')
  const versionId = String(formData.get('versionId') ?? '')
  const result = await runAdminAssessmentRegressionSuite({ assessmentId, versionId })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return { status: 'error', message: result.message }
  }

  return { status: 'success', message: result.message, suite: result.suite ?? undefined }
}
