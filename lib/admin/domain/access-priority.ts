import { AccessQuery } from './access-query'
import { organisationMemberships } from './mock-data'
import { InternalAdminRole } from './roles'
import { User, UserKind, UserStatus } from './users'

export type AccessPriorityLevel =
  | 'critical'
  | 'high'
  | 'medium'
  | 'low'

export interface AccessPriorityAssessment {
  score: number
  level: AccessPriorityLevel
  reasons: string[]
}

export interface AccessPresetView {
  id: string
  label: string
  description: string
  query: AccessQuery
}

const PRIORITY_LEVEL_THRESHOLDS: Array<{ level: AccessPriorityLevel; minimumScore: number }> = [
  { level: 'critical', minimumScore: 80 },
  { level: 'high', minimumScore: 50 },
  { level: 'medium', minimumScore: 25 },
  { level: 'low', minimumScore: 0 },
]

const PRIVILEGED_INTERNAL_ROLES = new Set<InternalAdminRole>([
  InternalAdminRole.SuperAdmin,
  InternalAdminRole.PlatformAdmin,
])

const PRIORITY_RULES: Array<{
  score: number
  reason: string
  matches: (user: User) => boolean
}> = [
  {
    score: 40,
    reason: 'Suspended identity',
    matches: (user) => user.status === UserStatus.Suspended,
  },
  {
    score: 35,
    reason: 'Elevated platform access',
    matches: (user) => user.kind === UserKind.InternalAdmin && user.internalAdminRole === InternalAdminRole.SuperAdmin,
  },
  {
    score: 30,
    reason: 'Internal access requires review',
    matches: (user) => user.kind === UserKind.InternalAdmin && user.status !== UserStatus.Active,
  },
  {
    score: 25,
    reason: 'Cross-organisation membership',
    matches: (user) => getUserMembershipCount(user) > 1,
  },
  {
    score: 20,
    reason: 'Invite pending activation',
    matches: (user) => user.status === UserStatus.Invited && !user.externalAuthId,
  },
  {
    score: 20,
    reason: 'No recent activity',
    matches: (user) => getUserActivityBand(user) === 'inactive',
  },
  {
    score: 10,
    reason: 'Inactive activity band',
    matches: (user) => getUserActivityBand(user) === 'inactive',
  },
  {
    score: 10,
    reason: 'Invited status',
    matches: (user) => user.status === UserStatus.Invited,
  },
  {
    score: 5,
    reason: 'Privileged internal role',
    matches: (user) => Boolean(user.internalAdminRole && PRIVILEGED_INTERNAL_ROLES.has(user.internalAdminRole)),
  },
]

function getUserMembershipCount(user: User): number {
  return organisationMemberships.filter((membership) => membership.userId === user.id).length
}

export function getUserLastActivityTimestamp(user: User): number | null {
  if (!user.recentActivity.lastActiveAt) {
    return null
  }

  const timestamp = Date.parse(user.recentActivity.lastActiveAt)

  return Number.isFinite(timestamp) ? timestamp : null
}

function getUserActivityBand(user: User): 'active_now' | 'recent' | 'inactive' {
  const lastActiveTimestamp = getUserLastActivityTimestamp(user)

  if (lastActiveTimestamp === null) {
    return 'inactive'
  }

  const referenceTimestamp = Math.max(
    ...organisationMemberships
      .map((membership) => membership.lastActiveAt ? Date.parse(membership.lastActiveAt) : Number.NaN)
      .filter((timestamp) => Number.isFinite(timestamp)),
    lastActiveTimestamp,
  )
  const daysSinceActivity = Math.floor((referenceTimestamp - lastActiveTimestamp) / (24 * 60 * 60 * 1000))

  if (daysSinceActivity <= 1) {
    return 'active_now'
  }

  if (daysSinceActivity <= 21) {
    return 'recent'
  }

  return 'inactive'
}

function getPriorityLevel(score: number): AccessPriorityLevel {
  return PRIORITY_LEVEL_THRESHOLDS.find((threshold) => score >= threshold.minimumScore)?.level ?? 'low'
}

export function getPriorityReasons(user: User): string[] {
  return PRIORITY_RULES
    .filter((rule) => rule.matches(user))
    .map((rule) => rule.reason)
}

export function assessUserAccessPriority(user: User): AccessPriorityAssessment {
  const matchedRules = PRIORITY_RULES.filter((rule) => rule.matches(user))
  const score = matchedRules.reduce((total, rule) => total + rule.score, 0)

  return {
    score,
    level: getPriorityLevel(score),
    reasons: matchedRules.map((rule) => rule.reason),
  }
}

export function compareUsersByPriority(a: User, b: User): number {
  const scoreDelta = assessUserAccessPriority(b).score - assessUserAccessPriority(a).score

  if (scoreDelta !== 0) {
    return scoreDelta
  }

  const activityDelta = (getUserLastActivityTimestamp(b) ?? Number.NEGATIVE_INFINITY) - (getUserLastActivityTimestamp(a) ?? Number.NEGATIVE_INFINITY)

  if (activityDelta !== 0) {
    return activityDelta
  }

  return a.profile.fullName.localeCompare(b.profile.fullName)
}

export function prioritiseUsers(users: User[]): User[] {
  return [...users].sort(compareUsersByPriority)
}

export function getAccessPresetViews(): AccessPresetView[] {
  return [
    {
      id: 'high-risk',
      label: 'High risk',
      description: 'Elevated access, review posture, and cross-org identities.',
      query: {
        scope: 'all',
        riskFlags: ['elevated_access', 'internal_review', 'multi_org'],
      },
    },
    {
      id: 'dormant-access',
      label: 'Dormant access',
      description: 'Active or invited users currently sitting in an inactive band.',
      query: {
        scope: 'all',
        activityBand: ['inactive'],
        status: ['active', 'invited'],
      },
    },
    {
      id: 'privileged-internal-access',
      label: 'Privileged internal access',
      description: 'Internal operators with privileged administrative roles.',
      query: {
        scope: 'internal',
        roleTypes: [
          InternalAdminRole.SuperAdmin,
          InternalAdminRole.PlatformAdmin,
          InternalAdminRole.AssessmentAdmin,
          InternalAdminRole.SupportAdmin,
          InternalAdminRole.CustomerSuccessAdmin,
        ],
      },
    },
    {
      id: 'cross-org-identities',
      label: 'Cross-org identities',
      description: 'Identities with more than one organisation membership.',
      query: {
        scope: 'multi_org',
      },
    },
  ]
}
