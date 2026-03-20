import { UserKind } from './users'

export enum AuditEntityType {
  Organisation = 'organisation',
  Membership = 'membership',
  User = 'user',
  Assessment = 'assessment',
  AssessmentVersion = 'assessment_version',
  Release = 'release',
  AdminAccess = 'admin_access',
}

export enum AuditAction {
  Created = 'created',
  Updated = 'updated',
  Published = 'published',
  Archived = 'archived',
  StatusChanged = 'status_changed',
  RoleGranted = 'role_granted',
  RoleRevoked = 'role_revoked',
  SignIn = 'sign_in',
}

export interface AuditActorSummary {
  userId: string
  displayName: string
  email: string
  kind: UserKind
}

export interface AuditEntityReference {
  entityType: AuditEntityType
  entityId: string
  label: string
}

export interface AuditLogEvent {
  id: string
  action: AuditAction
  actor: AuditActorSummary
  entity: AuditEntityReference
  occurredAt: string
  summary: string
  details: Record<string, string | number | boolean | null>
}
