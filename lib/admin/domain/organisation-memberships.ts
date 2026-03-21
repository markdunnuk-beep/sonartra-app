import type { AdminOrganisationMemberRecord } from '@/lib/admin/domain/organisation-detail'

export const ADMIN_ORGANISATION_MEMBERSHIP_ROLES = ['owner', 'admin', 'manager', 'analyst'] as const
export type AdminOrganisationMembershipRole = (typeof ADMIN_ORGANISATION_MEMBERSHIP_ROLES)[number]

export const ADMIN_ORGANISATION_MEMBERSHIP_STATUSES = ['active', 'invited', 'suspended', 'inactive'] as const
export type AdminOrganisationMembershipStatus = (typeof ADMIN_ORGANISATION_MEMBERSHIP_STATUSES)[number]

export interface AdminOrganisationMemberFilters {
  search: string
  role: AdminOrganisationMembershipRole | 'all'
  status: AdminOrganisationMembershipStatus | 'all'
}

export interface AdminOrganisationMembershipMutationState {
  status: 'idle' | 'error'
  message?: string
  fieldErrors?: Partial<Record<'identityId' | 'fullName' | 'email' | 'role' | 'action' | 'confirmation', string>>
}

export interface AdminOrganisationMembershipCandidate {
  identityId: string
  fullName: string
  email: string
  identityStatus: string
  authBound: boolean
  membershipStatus: AdminOrganisationMembershipStatus | null
  membershipRole: string | null
  lastActivityAt: string | null
}

function isMembershipRole(value: string | null | undefined): value is AdminOrganisationMembershipRole {
  return (ADMIN_ORGANISATION_MEMBERSHIP_ROLES as readonly string[]).includes(value ?? '')
}

function isMembershipStatus(value: string | null | undefined): value is AdminOrganisationMembershipStatus {
  return (ADMIN_ORGANISATION_MEMBERSHIP_STATUSES as readonly string[]).includes(value ?? '')
}

function normaliseQueryValue(value: string | string[] | undefined): string {
  return Array.isArray(value) ? value[0]?.trim() ?? '' : value?.trim() ?? ''
}

export function getAdminOrganisationMemberFilters(searchParams?: Record<string, string | string[] | undefined>): AdminOrganisationMemberFilters {
  const search = normaliseQueryValue(searchParams?.membersSearch)
  const requestedRole = normaliseQueryValue(searchParams?.memberRole)
  const requestedStatus = normaliseQueryValue(searchParams?.memberStatus)

  return {
    search,
    role: isMembershipRole(requestedRole) ? requestedRole : 'all',
    status: isMembershipStatus(requestedStatus) ? requestedStatus : 'all',
  }
}

export function filterAdminOrganisationMembers(
  members: AdminOrganisationMemberRecord[],
  filters: AdminOrganisationMemberFilters,
): AdminOrganisationMemberRecord[] {
  const searchNeedle = filters.search.trim().toLowerCase()

  return members.filter((member) => {
    if (filters.role !== 'all' && member.role !== filters.role) {
      return false
    }

    if (filters.status !== 'all' && member.accessStatus !== filters.status) {
      return false
    }

    if (!searchNeedle) {
      return true
    }

    return `${member.fullName} ${member.email}`.toLowerCase().includes(searchNeedle)
  })
}
