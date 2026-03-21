export type AdminOrganisationDetailTab = 'overview' | 'members' | 'assessments' | 'activity' | 'settings'

export interface AdminOrganisationSummaryRecord {
  id: string
  name: string
  slug: string
  status: string
  country: string | null
  planTier: string | null
  seatBand: string | null
  classification: 'internal' | 'external' | null
  createdAt: string
  updatedAt: string
  totalMembers: number
  activeMembers: number
  invitedMembers: number
  inactiveMembers: number
  assignedAssessments: number
  assessmentCatalogCount: number
  completedAssessments: number
  lastMembershipActivityAt: string | null
  lastAssessmentActivityAt: string | null
  lastAuditActivityAt: string | null
  lastOperationalActivityAt: string | null
}

export interface AdminOrganisationMemberRecord {
  membershipId: string
  identityId: string
  fullName: string
  email: string
  role: string
  accessStatus: string
  joinedAt: string | null
  invitedAt: string | null
  lastActivityAt: string | null
}

export interface AdminOrganisationAssessmentRecord {
  assessmentVersionId: string
  title: string
  libraryKey: string
  publishState: 'published' | 'unpublished'
  assignedUsersCount: number
  completionCount: number
  updatedAt: string | null
}

export interface AdminOrganisationActivityRecord {
  id: string
  eventType: string
  summary: string
  actorId?: string | null
  actorName: string | null
  happenedAt: string
  source: 'audit' | 'membership' | 'organisation'
  organisationId?: string | null
  organisationName?: string | null
  entityType?: 'organisation' | 'membership' | 'user' | 'admin_access' | 'assessment' | 'assessment_version'
  entityId?: string | null
  entityName?: string | null
}

export interface AdminOrganisationDetailData {
  organisation: AdminOrganisationSummaryRecord
  members: AdminOrganisationMemberRecord[]
  assessments: AdminOrganisationAssessmentRecord[]
  recentActivity: AdminOrganisationActivityRecord[]
  auditTrail: AdminOrganisationActivityRecord[]
}

export const ADMIN_ORGANISATION_DETAIL_TABS: AdminOrganisationDetailTab[] = ['overview', 'members', 'assessments', 'activity', 'settings']

export function getAdminOrganisationDetailTab(tab?: string | null): AdminOrganisationDetailTab {
  if (tab && ADMIN_ORGANISATION_DETAIL_TABS.includes(tab as AdminOrganisationDetailTab)) {
    return tab as AdminOrganisationDetailTab
  }

  return 'overview'
}

export function getAdminOrganisationClassificationLabel(classification: AdminOrganisationSummaryRecord['classification']): string {
  switch (classification) {
    case 'internal':
      return 'Internal'
    case 'external':
      return 'External'
    default:
      return 'Not classified'
  }
}

export function getAssessmentPublishStateLabel(publishState: AdminOrganisationAssessmentRecord['publishState']): string {
  return publishState === 'published' ? 'Published' : 'Unpublished'
}
