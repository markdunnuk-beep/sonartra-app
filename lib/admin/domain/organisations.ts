export enum OrganisationStatus {
  Prospect = 'prospect',
  Trial = 'trial',
  Active = 'active',
  Implementation = 'implementation',
  Suspended = 'suspended',
  Churned = 'churned',
}

export enum OrganisationPlan {
  Essential = 'essential',
  Growth = 'growth',
  Enterprise = 'enterprise',
}

export enum OrganisationRole {
  Owner = 'owner',
  Admin = 'admin',
  Manager = 'manager',
  Member = 'member',
  Analyst = 'analyst',
}

export interface SeatAllocationSummary {
  purchased: number
  assigned: number
  invited: number
  available: number
}

export interface EnabledProductSummary {
  productKey: string
  label: string
  enabled: boolean
  enabledAssessmentIds: string[]
}

export interface Organisation {
  id: string
  slug: string
  name: string
  status: OrganisationStatus
  plan: OrganisationPlan
  sector: string
  region: string
  primaryContactUserId: string | null
  seatSummary: SeatAllocationSummary
  enabledProducts: EnabledProductSummary[]
  enabledAssessmentIds: string[]
  workspaceProvisionedAt: string | null
  contractRenewalDate: string | null
  lastActivityAt: string | null
  createdAt: string
  updatedAt: string
}

export interface OrganisationMembership {
  id: string
  organisationId: string
  userId: string
  role: OrganisationRole
  isBillingContact: boolean
  isAssessmentContact: boolean
  invitedAt: string | null
  joinedAt: string | null
  lastActiveAt: string | null
  createdAt: string
  updatedAt: string
}
