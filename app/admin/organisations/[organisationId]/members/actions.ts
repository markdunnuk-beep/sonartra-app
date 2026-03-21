'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import type { AdminOrganisationMembershipMutationState } from '@/lib/admin/domain/organisation-memberships'
import {
  addAdminOrganisationMembership,
  buildAdminOrganisationMembershipMutationState,
  inviteAdminOrganisationMember,
  updateAdminOrganisationMembershipRole,
  updateAdminOrganisationMembershipStatus,
} from '@/lib/admin/server/organisation-memberships'

const INITIAL_REDIRECT_TAB = 'members'

function revalidateMembershipSurfaces(organisationId: string, identityId?: string) {
  revalidatePath('/admin/organisations')
  revalidatePath(`/admin/organisations/${organisationId}`)
  revalidatePath(`/admin/organisations/${organisationId}/edit`)
  revalidatePath(`/admin/organisations/${organisationId}/members/new`)
  revalidatePath('/admin/audit')
  revalidatePath('/admin/users')

  if (identityId) {
    revalidatePath(`/admin/users/${identityId}`)
  }
}

function buildRedirectPath(organisationId: string, mutation: string, tab = INITIAL_REDIRECT_TAB) {
  return `/admin/organisations/${organisationId}?tab=${tab}&mutation=${mutation}`
}

export async function submitAdminOrganisationMembershipLinkAction(
  _previousState: AdminOrganisationMembershipMutationState,
  formData: FormData,
): Promise<AdminOrganisationMembershipMutationState> {
  const organisationId = String(formData.get('organisationId') ?? '')
  const result = await addAdminOrganisationMembership({
    organisationId,
    identityId: String(formData.get('identityId') ?? ''),
    role: String(formData.get('role') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminOrganisationMembershipMutationState(result)
  }

  revalidateMembershipSurfaces(organisationId, result.identityId)
  redirect(buildRedirectPath(organisationId, result.mutation ?? 'member-added'))
}

export async function submitAdminOrganisationMembershipInviteAction(
  _previousState: AdminOrganisationMembershipMutationState,
  formData: FormData,
): Promise<AdminOrganisationMembershipMutationState> {
  const organisationId = String(formData.get('organisationId') ?? '')
  const result = await inviteAdminOrganisationMember({
    organisationId,
    email: String(formData.get('email') ?? ''),
    fullName: String(formData.get('fullName') ?? ''),
    role: String(formData.get('role') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminOrganisationMembershipMutationState(result)
  }

  revalidateMembershipSurfaces(organisationId, result.identityId)
  redirect(buildRedirectPath(organisationId, result.mutation ?? 'member-invited'))
}

export async function submitAdminOrganisationMembershipRoleAction(
  _previousState: AdminOrganisationMembershipMutationState,
  formData: FormData,
): Promise<AdminOrganisationMembershipMutationState> {
  const organisationId = String(formData.get('organisationId') ?? '')
  const result = await updateAdminOrganisationMembershipRole({
    organisationId,
    identityId: String(formData.get('identityId') ?? ''),
    role: String(formData.get('role') ?? ''),
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminOrganisationMembershipMutationState(result)
  }

  revalidateMembershipSurfaces(organisationId, result.identityId)
  redirect(buildRedirectPath(organisationId, result.mutation ?? 'member-role-updated'))
}

export async function submitAdminOrganisationMembershipStatusAction(
  _previousState: AdminOrganisationMembershipMutationState,
  formData: FormData,
): Promise<AdminOrganisationMembershipMutationState> {
  const organisationId = String(formData.get('organisationId') ?? '')
  const result = await updateAdminOrganisationMembershipStatus({
    organisationId,
    identityId: String(formData.get('identityId') ?? ''),
    nextStatus: String(formData.get('nextStatus') ?? ''),
    confirmation: formData.get('confirmation') === 'confirm' ? 'confirm' : undefined,
  })

  if (!result.ok && result.code === 'permission_denied') {
    redirect('/sign-in')
  }

  if (!result.ok) {
    return buildAdminOrganisationMembershipMutationState(result)
  }

  revalidateMembershipSurfaces(organisationId, result.identityId)
  redirect(buildRedirectPath(organisationId, result.mutation ?? 'member-updated'))
}
