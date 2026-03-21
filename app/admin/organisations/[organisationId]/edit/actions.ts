'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { AdminOrganisationMutationState } from '@/lib/admin/domain/organisation-mutations'
import {
  buildAdminOrganisationMutationState,
  transitionAdminOrganisationStatus,
  updateAdminOrganisation,
} from '@/lib/admin/server/organisation-mutations'

export async function submitAdminOrganisationEditAction(
  _previousState: AdminOrganisationMutationState,
  formData: FormData,
): Promise<AdminOrganisationMutationState> {
  const organisationId = String(formData.get('organisationId') ?? '')
  const result = await updateAdminOrganisation({
    organisationId,
    name: String(formData.get('name') ?? ''),
    slug: String(formData.get('slug') ?? ''),
    status: String(formData.get('status') ?? ''),
    country: String(formData.get('country') ?? ''),
    planTier: String(formData.get('planTier') ?? ''),
    seatBand: String(formData.get('seatBand') ?? ''),
    expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminOrganisationMutationState(result)
  }

  revalidatePath('/admin/organisations')
  revalidatePath(`/admin/organisations/${organisationId}`)
  revalidatePath(`/admin/organisations/${organisationId}/edit`)
  revalidatePath('/admin/audit')
  redirect(`/admin/organisations/${organisationId}?mutation=updated`)
}

export async function submitAdminOrganisationLifecycleAction(
  _previousState: AdminOrganisationMutationState,
  formData: FormData,
): Promise<AdminOrganisationMutationState> {
  const organisationId = String(formData.get('organisationId') ?? '')
  const targetStatus = String(formData.get('targetStatus') ?? '')
  const result = await transitionAdminOrganisationStatus({
    organisationId,
    targetStatus,
    expectedUpdatedAt: String(formData.get('expectedUpdatedAt') ?? ''),
    confirmation: formData.get('confirmation') === 'on' ? 'confirm' : undefined,
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminOrganisationMutationState(result)
  }

  revalidatePath('/admin/organisations')
  revalidatePath(`/admin/organisations/${organisationId}`)
  revalidatePath(`/admin/organisations/${organisationId}/edit`)
  revalidatePath('/admin/audit')
  redirect(`/admin/organisations/${organisationId}?tab=activity&mutation=${targetStatus === 'suspended' ? 'deactivated' : 'reactivated'}`)
}
