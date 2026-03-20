import { Activity, Building2, ClipboardList, FileSearch, LayoutDashboard, Rocket, Users2 } from 'lucide-react'
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

export interface AdminNavigationItem {
  key: AdminRouteKey
  label: string
  href: string
  icon: typeof LayoutDashboard
  description: string
  startsWith?: string
  requiredRoles: InternalAdminRole[]
  compatibleProvisionalRoles: ProvisionalAdminRole[]
  requiredCapabilities: AdminCapability[]
}

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    key: AdminModuleKey.Dashboard,
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Control overview for tenant posture, release readiness, and audit signals.',
    requiredRoles: Object.values(InternalAdminRole),
    compatibleProvisionalRoles: [ProvisionalAdminRole.InternalAdmin],
    requiredCapabilities: [AdminCapability.DashboardView],
  },
  {
    key: AdminModuleKey.Organisations,
    label: 'Organisations',
    href: '/admin/organisations',
    icon: Building2,
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
    icon: Users2,
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
    icon: ClipboardList,
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
    icon: Rocket,
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
    icon: FileSearch,
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
  icon: typeof Activity
}

export const adminDashboardMetrics: AdminQuickMetric[] = [
  {
    label: 'Customer tenants',
    value: `${organisations.length}`.padStart(2, '0'),
    detail: 'Provisioned organisations currently attached to managed Sonartra workspaces.',
    icon: Building2,
  },
  {
    label: 'Privileged operators',
    value: `${adminUsers.filter((user) => user.internalAdminRole !== null).length}`.padStart(2, '0'),
    detail: 'Internal Sonartra admins with authority to review release and audit controls.',
    icon: Users2,
  },
  {
    label: 'Assessment lines',
    value: `${assessments.length}`.padStart(2, '0'),
    detail: 'Assessment families actively governed through versioned registry controls.',
    icon: ClipboardList,
  },
  {
    label: 'Release posture',
    value: assessmentVersions.some((version) => version.validationSummary.ruleErrors > 0) ? 'Attention' : 'Stable',
    detail: 'Current posture across live and pending assessment version releases.',
    icon: Rocket,
  },
]

export const adminCapabilityLabels = Object.fromEntries(
  Object.entries(adminModuleCapabilityMap).map(([moduleKey, capability]) => [moduleKey, capability]),
)

export const internalAdminRoleSummaries = Object.values(adminRoleDefinitions)

export const recentAuditSignalCount = auditLogEvents.length
