import {
  buildAdminOrganisationRegistryDomainData,
  type AdminOrganisationRegistryDomainData,
} from '@/lib/admin/domain/organisation-registry'
import {
  OrganisationPlan,
  OrganisationStatus,
  type Organisation,
} from '@/lib/admin/domain/organisations'
import type { AdminOrganisationRegistryDTO } from './organisation-registry'

function logOrganisationRegistryInvariant(message: string, details?: Record<string, unknown>) {
  console.error(`[admin-organisation-registry-mapper] ${message}`, details ?? {})
}

function mapOrganisationStatus(status: string): OrganisationStatus {
  switch (status) {
    case 'prospect':
      return OrganisationStatus.Prospect
    case 'trial':
      return OrganisationStatus.Trial
    case 'implementation':
      return OrganisationStatus.Implementation
    case 'suspended':
      return OrganisationStatus.Suspended
    case 'churned':
      return OrganisationStatus.Churned
    case 'active':
    case 'inactive':
    case 'invited':
      return OrganisationStatus.Active
    default:
      logOrganisationRegistryInvariant('Unexpected organisation status encountered during organisation registry mapping.', { status })
      return OrganisationStatus.Active
  }
}

function mapOrganisationPlan(planTier?: string | null): Organisation['plan'] {
  switch (planTier) {
    case 'essential':
      return OrganisationPlan.Essential
    case 'enterprise':
      return OrganisationPlan.Enterprise
    case 'growth':
    case null:
    case undefined:
    case '':
      return OrganisationPlan.Growth
    default:
      logOrganisationRegistryInvariant('Unexpected organisation plan encountered during organisation registry mapping.', { planTier })
      return OrganisationPlan.Growth
  }
}

function mapDtoToOrganisation(dto: AdminOrganisationRegistryDTO): Organisation {
  return {
    id: dto.id,
    slug: dto.slug,
    name: dto.name,
    status: mapOrganisationStatus(dto.status),
    plan: mapOrganisationPlan(dto.planTier),
    sector: 'Organisation',
    region: dto.country ?? 'Unknown region',
    primaryContactUserId: null,
    seatSummary: {
      purchased: dto.membershipCount,
      assigned: dto.activeMembershipCount,
      invited: dto.invitedMembershipCount,
      available: 0,
    },
    enabledProducts: [],
    enabledAssessmentIds: [],
    workspaceProvisionedAt: null,
    contractRenewalDate: null,
    lastActivityAt: dto.lastMembershipActivityAt ?? dto.lastAuditActivityAt ?? dto.updatedAt,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}

export function mapOrganisationRegistryDtosToDomainData(dtos: AdminOrganisationRegistryDTO[] | null | undefined): AdminOrganisationRegistryDomainData {
  const safeDtos = Array.isArray(dtos) ? dtos : []

  return buildAdminOrganisationRegistryDomainData(safeDtos.map((dto) => {
    const organisation = mapDtoToOrganisation(dto)

    return {
      organisation,
      membershipCount: dto.membershipCount,
      activeMembershipCount: dto.activeMembershipCount,
      invitedMembershipCount: dto.invitedMembershipCount,
      inactiveMembershipCount: dto.inactiveMembershipCount,
      ownerCount: dto.ownerCount,
      adminCount: dto.adminCount,
      multiOrgMemberCount: dto.multiOrgMemberCount,
      lastMembershipActivityAt: dto.lastMembershipActivityAt ?? null,
      lastAuditActivityAt: dto.lastAuditActivityAt ?? null,
      lastOperationalActivityAt: dto.lastMembershipActivityAt ?? dto.lastAuditActivityAt ?? dto.updatedAt,
    }
  }))
}
