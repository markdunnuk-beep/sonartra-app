import { InternalAdminRole } from './roles'

export enum UserStatus {
  Invited = 'invited',
  Active = 'active',
  Suspended = 'suspended',
  Deactivated = 'deactivated',
}

export enum UserKind {
  InternalAdmin = 'internal_admin',
  OrganisationUser = 'organisation_user',
}

export interface UserProfile {
  firstName: string
  lastName: string
  fullName: string
  title: string | null
  avatarUrl: string | null
}

export interface UserRecentActivity {
  lastActiveAt: string | null
  lastAuditEventId: string | null
  lastAssessmentVersionId: string | null
}

export interface User {
  id: string
  externalAuthId: string | null
  email: string
  status: UserStatus
  kind: UserKind
  profile: UserProfile
  internalAdminRole: InternalAdminRole | null
  primaryOrganisationId: string | null
  recentActivity: UserRecentActivity
  createdAt: string
  updatedAt: string
}
