export enum InternalAdminRole {
  SuperAdmin = 'super_admin',
  PlatformAdmin = 'platform_admin',
  AssessmentAdmin = 'assessment_admin',
  CustomerSuccessAdmin = 'customer_success_admin',
  SupportAdmin = 'support_admin',
}

export enum ProvisionalAdminRole {
  InternalAdmin = 'internal_admin',
}

export enum AdminModuleKey {
  Dashboard = 'dashboard',
  Organisations = 'organisations',
  Users = 'users',
  Assessments = 'assessments',
  Releases = 'releases',
  Audit = 'audit',
}

export enum AdminCapability {
  DashboardView = 'dashboard:view',
  OrganisationsView = 'organisations:view',
  UsersView = 'users:view',
  AssessmentsView = 'assessments:view',
  ReleasesView = 'releases:view',
  AuditView = 'audit:view',
}

export interface AdminRoleDefinition {
  role: InternalAdminRole
  label: string
  description: string
  capabilities: AdminCapability[]
  compatibleProvisionalRoles: ProvisionalAdminRole[]
}

export const adminRoleDefinitions: Record<InternalAdminRole, AdminRoleDefinition> = {
  [InternalAdminRole.SuperAdmin]: {
    role: InternalAdminRole.SuperAdmin,
    label: 'Super admin',
    description: 'Global authority across platform governance, releases, tenancy, and operator access.',
    capabilities: Object.values(AdminCapability),
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
  },
  [InternalAdminRole.PlatformAdmin]: {
    role: InternalAdminRole.PlatformAdmin,
    label: 'Platform admin',
    description: 'Owns platform posture, customer tenants, and cross-module operating control.',
    capabilities: [
      AdminCapability.DashboardView,
      AdminCapability.OrganisationsView,
      AdminCapability.UsersView,
      AdminCapability.AssessmentsView,
      AdminCapability.ReleasesView,
      AdminCapability.AuditView,
    ],
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
  },
  [InternalAdminRole.AssessmentAdmin]: {
    role: InternalAdminRole.AssessmentAdmin,
    label: 'Assessment admin',
    description: 'Govern assessment registry, version lineage, validation, and publish readiness.',
    capabilities: [
      AdminCapability.DashboardView,
      AdminCapability.AssessmentsView,
      AdminCapability.ReleasesView,
      AdminCapability.AuditView,
    ],
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
  },
  [InternalAdminRole.CustomerSuccessAdmin]: {
    role: InternalAdminRole.CustomerSuccessAdmin,
    label: 'Customer success admin',
    description: 'Monitors tenant health, adoption posture, and customer-side administrators.',
    capabilities: [
      AdminCapability.DashboardView,
      AdminCapability.OrganisationsView,
      AdminCapability.UsersView,
      AdminCapability.AuditView,
    ],
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
  },
  [InternalAdminRole.SupportAdmin]: {
    role: InternalAdminRole.SupportAdmin,
    label: 'Support admin',
    description: 'Investigates support issues with controlled access to tenant and audit context.',
    capabilities: [
      AdminCapability.DashboardView,
      AdminCapability.OrganisationsView,
      AdminCapability.UsersView,
      AdminCapability.AuditView,
    ],
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
  },
}

export const bootstrapProvisionalRoleCompatibility: Record<ProvisionalAdminRole, InternalAdminRole[]> = {
  [ProvisionalAdminRole.InternalAdmin]: Object.values(InternalAdminRole),
}

export function getAdminRoleDefinition(role: InternalAdminRole): AdminRoleDefinition {
  return adminRoleDefinitions[role]
}
