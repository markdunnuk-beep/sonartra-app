import { Activity, Building2, ClipboardList, FileSearch, LayoutDashboard, Rocket, Users2 } from 'lucide-react'
import { AdminAccessContext, ProvisionalAdminRole } from '@/lib/admin/access'

export type AdminCapability =
  | 'dashboard:view'
  | 'organisations:view'
  | 'users:view'
  | 'assessments:view'
  | 'releases:view'
  | 'audit:view'

export type AdminRouteKey =
  | 'dashboard'
  | 'organisations'
  | 'users'
  | 'assessments'
  | 'releases'
  | 'audit'

export interface AdminNavigationItem {
  key: AdminRouteKey
  label: string
  href: string
  icon: typeof LayoutDashboard
  description: string
  startsWith?: string
  requiredRoles: ProvisionalAdminRole[]
  requiredCapabilities: AdminCapability[]
}

export const adminNavigationItems: AdminNavigationItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Control overview for tenant posture, release readiness, and audit signals.',
    requiredRoles: ['internal_admin'],
    requiredCapabilities: ['dashboard:view'],
  },
  {
    key: 'organisations',
    label: 'Organisations',
    href: '/admin/organisations',
    icon: Building2,
    startsWith: '/admin/organisations',
    description: 'Manage customer tenants, seat posture, enabled assessments, and operating status.',
    requiredRoles: ['internal_admin'],
    requiredCapabilities: ['organisations:view'],
  },
  {
    key: 'users',
    label: 'Users',
    href: '/admin/users',
    icon: Users2,
    startsWith: '/admin/users',
    description: 'Oversee internal admins, customer admins, memberships, and access state.',
    requiredRoles: ['internal_admin'],
    requiredCapabilities: ['users:view'],
  },
  {
    key: 'assessments',
    label: 'Assessments',
    href: '/admin/assessments',
    icon: ClipboardList,
    startsWith: '/admin/assessments',
    description: 'Control assessment registry, version validation, and publish state.',
    requiredRoles: ['internal_admin'],
    requiredCapabilities: ['assessments:view'],
  },
  {
    key: 'releases',
    label: 'Releases',
    href: '/admin/releases',
    icon: Rocket,
    startsWith: '/admin/releases',
    description: 'Drive release readiness, publish decisions, and staged rollout control.',
    requiredRoles: ['internal_admin'],
    requiredCapabilities: ['releases:view'],
  },
  {
    key: 'audit',
    label: 'Audit',
    href: '/admin/audit',
    icon: FileSearch,
    startsWith: '/admin/audit',
    description: 'Review operational history, privileged actions, and evidence trails.',
    requiredRoles: ['internal_admin'],
    requiredCapabilities: ['audit:view'],
  },
]

export function getAdminNavigationItems(access: AdminAccessContext): AdminNavigationItem[] {
  return adminNavigationItems.filter((item) => {
    if (!access.isAllowed || access.provisionalRole === null) {
      return false
    }

    return item.requiredRoles.includes(access.provisionalRole)
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
    value: '24',
    detail: 'Provisioned organisations currently attached to managed Sonartra workspaces.',
    icon: Building2,
  },
  {
    label: 'Privileged operators',
    value: '08',
    detail: 'Internal Sonartra admins with authority to review release and audit controls.',
    icon: Users2,
  },
  {
    label: 'Assessment lines',
    value: '05',
    detail: 'Assessment families actively governed through versioned registry controls.',
    icon: ClipboardList,
  },
  {
    label: 'Release posture',
    value: 'Stable',
    detail: 'No blocked publish decisions or unresolved validation holds in the current cycle.',
    icon: Rocket,
  },
]
