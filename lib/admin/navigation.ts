import { AdminAccessContext } from '@/lib/admin/access'
import {
  AdminCapability,
  AdminModuleKey,
  InternalAdminRole,
  ProvisionalAdminRole,
  adminModuleCapabilityMap,
  adminRoleDefinitions,
  assessmentVersions,
  assessments,
  auditLogEvents,
  organisations,
  adminUsers,
} from '@/lib/admin/domain'

export type AdminRouteKey = `${AdminModuleKey}`

export type AdminNavigationIconKey = 'dashboard' | 'organisations' | 'users' | 'assessments' | 'releases' | 'audit'

export interface AdminNavigationItem {
  key: AdminRouteKey
  label: string
  href: string
  iconKey: AdminNavigationIconKey
  description: string
  startsWith?: string
  requiredRoles: InternalAdminRole[]
  compatibleProvisionalRoles: ProvisionalAdminRole[]
  requiredCapabilities: AdminCapability[]
}

export const canonicalAdminLandingHref = '/admin'

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    key: AdminModuleKey.Dashboard,
    label: 'Dashboard',
    href: canonicalAdminLandingHref,
    iconKey: 'dashboard',
    description: 'Control overview for tenant posture, release readiness, and audit signals.',
    requiredRoles: Object.values(InternalAdminRole),
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
    requiredCapabilities: [AdminCapability.DashboardView],
  },
  {
    key: AdminModuleKey.Organisations,
    label: 'Organisations',
    href: '/admin/organisations',
    iconKey: 'organisations',
    startsWith: '/admin/organisations',
    description: 'Manage customer tenants, seat posture, enabled assessments, and operating status.',
    requiredRoles: [
      InternalAdminRole.SuperAdmin,
      InternalAdminRole.PlatformAdmin,
      InternalAdminRole.CustomerSuccessAdmin,
      InternalAdminRole.SupportAdmin,
    ],
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
    requiredCapabilities: [AdminCapability.OrganisationsView],
  },
  {
    key: AdminModuleKey.Users,
    label: 'Users',
    href: '/admin/users',
    iconKey: 'users',
    startsWith: '/admin/users',
    description: 'Oversee internal admins, customer admins, memberships, and access state.',
    requiredRoles: [
      InternalAdminRole.SuperAdmin,
      InternalAdminRole.PlatformAdmin,
      InternalAdminRole.CustomerSuccessAdmin,
      InternalAdminRole.SupportAdmin,
    ],
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
    requiredCapabilities: [AdminCapability.UsersView],
  },
  {
    key: AdminModuleKey.Assessments,
    label: 'Assessments',
    href: '/admin/assessments',
    iconKey: 'assessments',
    startsWith: '/admin/assessments',
    description: 'Control assessment registry, version validation, and publish state.',
    requiredRoles: [InternalAdminRole.SuperAdmin, InternalAdminRole.PlatformAdmin, InternalAdminRole.AssessmentAdmin],
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
    requiredCapabilities: [AdminCapability.AssessmentsView],
  },
  {
    key: AdminModuleKey.Releases,
    label: 'Releases',
    href: '/admin/releases',
    iconKey: 'releases',
    startsWith: '/admin/releases',
    description: 'Drive release readiness, publish decisions, and staged rollout control.',
    requiredRoles: [InternalAdminRole.SuperAdmin, InternalAdminRole.PlatformAdmin, InternalAdminRole.AssessmentAdmin],
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
    requiredCapabilities: [AdminCapability.ReleasesView],
  },
  {
    key: AdminModuleKey.Audit,
    label: 'Audit',
    href: '/admin/audit',
    iconKey: 'audit',
    startsWith: '/admin/audit',
    description: 'Review operational history, privileged actions, and evidence trails.',
    requiredRoles: Object.values(InternalAdminRole),
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
    requiredCapabilities: [AdminCapability.AuditView],
  },
]

export function getAdminNavigationItems(access: AdminAccessContext): AdminNavigationItem[] {
  return adminNavigationItems.filter((item) => {
    if (!access.isAllowed || access.provisionalRole === null) {
      return false
    }

    return item.compatibleProvisionalRoles.includes(access.provisionalRole)
  })
}

export interface AdminQuickMetric {
  label: string
  value: string
  detail: string
  iconKey: AdminNavigationIconKey | 'activity'
}

export const adminDashboardMetrics: AdminQuickMetric[] = [
  {
    label: 'Customer tenants',
    value: `${organisations.length}`.padStart(2, '0'),
    detail: 'Provisioned organisations currently attached to managed Sonartra workspaces.',
    iconKey: 'organisations',
  },
  {
    label: 'Privileged operators',
    value: `${adminUsers.filter((user) => user.internalAdminRole !== null).length}`.padStart(2, '0'),
    detail: 'Internal Sonartra admins with authority to review release and audit controls.',
    iconKey: 'users',
  },
  {
    label: 'Assessment lines',
    value: `${assessments.length}`.padStart(2, '0'),
    detail: 'Assessment families actively governed through versioned registry controls.',
    iconKey: 'assessments',
  },
  {
    label: 'Release posture',
    value: assessmentVersions.some((version) => version.validationSummary.ruleErrors > 0) ? 'Attention' : 'Stable',
    detail: 'Current posture across live and pending assessment version releases.',
    iconKey: 'releases',
  },
]

export const adminCapabilityLabels = Object.fromEntries(
  Object.entries(adminModuleCapabilityMap).map(([moduleKey, capability]) => [moduleKey, capability]),
)

export const internalAdminRoleSummaries = Object.values(adminRoleDefinitions)

export const recentAuditSignalCount = auditLogEvents.length
