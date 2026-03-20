import { AuditLogEvent } from './audit'
import { Organisation, OrganisationMembership } from './organisations'
import { auditLogEvents, organisationMemberships, organisations, adminUsers } from './mock-data'
import { User } from './users'

export interface AdminAccessRegistryDomainData {
  users: User[]
  organisations: Organisation[]
  memberships: OrganisationMembership[]
  auditEvents: AuditLogEvent[]
}

export const DEFAULT_ADMIN_ACCESS_REGISTRY_DATA: AdminAccessRegistryDomainData = {
  users: adminUsers,
  organisations,
  memberships: organisationMemberships,
  auditEvents: auditLogEvents,
}
