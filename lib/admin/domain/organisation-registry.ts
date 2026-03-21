import { Organisation, OrganisationStatus } from './organisations'

export type OrganisationRegistryLifecycle = 'new' | 'active' | 'dormant' | 'flagged'
export type OrganisationRegistryActivityBand = 'active_now' | 'recent' | 'inactive' | 'none'
export type OrganisationRegistryMembershipPosture = 'owned' | 'admin_covered' | 'member_only' | 'invited_only' | 'unassigned'

export interface OrganisationRegistryEntry {
  organisation: Organisation
  membershipCount: number
  activeMembershipCount: number
  invitedMembershipCount: number
  inactiveMembershipCount: number
  ownerCount: number
  adminCount: number
  multiOrgMemberCount: number
  lastMembershipActivityAt: string | null
  lastAuditActivityAt: string | null
  lastOperationalActivityAt: string | null
  lifecycle: OrganisationRegistryLifecycle
  activityBand: OrganisationRegistryActivityBand
  membershipPosture: OrganisationRegistryMembershipPosture
  flaggedReasons: string[]
}

export interface AdminOrganisationRegistryDomainData {
  organisations: OrganisationRegistryEntry[]
}

export interface OrganisationRegistryQuery {
  search?: string
  lifecycle?: OrganisationRegistryLifecycle[]
  activityBand?: OrganisationRegistryActivityBand[]
  membershipPosture?: OrganisationRegistryMembershipPosture[]
}

export const DEFAULT_ORGANISATION_REGISTRY_QUERY: OrganisationRegistryQuery = {}

function getReferenceDate(data: AdminOrganisationRegistryDomainData): Date {
  const timestamps = data.organisations.flatMap((entry) => (
    [
      entry.organisation.updatedAt,
      entry.organisation.createdAt,
      entry.lastMembershipActivityAt,
      entry.lastAuditActivityAt,
      entry.lastOperationalActivityAt,
    ]
      .map((value) => (value ? Date.parse(value) : Number.NaN))
      .filter((value) => Number.isFinite(value))
  ))

  return new Date(timestamps.length ? Math.max(...timestamps) : Date.now())
}

function getDaysSince(value: string | null, referenceDate: Date): number | null {
  if (!value) {
    return null
  }

  const timestamp = Date.parse(value)

  if (!Number.isFinite(timestamp)) {
    return null
  }

  return Math.floor((referenceDate.getTime() - timestamp) / (24 * 60 * 60 * 1000))
}

export function deriveOrganisationActivityBand(entry: Pick<OrganisationRegistryEntry, 'lastOperationalActivityAt'>, referenceDate: Date): OrganisationRegistryActivityBand {
  const daysSinceActivity = getDaysSince(entry.lastOperationalActivityAt, referenceDate)

  if (daysSinceActivity === null) {
    return 'none'
  }

  if (daysSinceActivity <= 3) {
    return 'active_now'
  }

  if (daysSinceActivity <= 21) {
    return 'recent'
  }

  return 'inactive'
}

export function deriveOrganisationMembershipPosture(entry: Pick<OrganisationRegistryEntry, 'ownerCount' | 'adminCount' | 'activeMembershipCount' | 'invitedMembershipCount'>): OrganisationRegistryMembershipPosture {
  if (entry.ownerCount > 0) {
    return 'owned'
  }

  if (entry.adminCount > 0) {
    return 'admin_covered'
  }

  if (entry.activeMembershipCount > 0) {
    return 'member_only'
  }

  if (entry.invitedMembershipCount > 0) {
    return 'invited_only'
  }

  return 'unassigned'
}

export function deriveOrganisationFlaggedReasons(entry: Pick<OrganisationRegistryEntry, 'organisation' | 'inactiveMembershipCount' | 'activeMembershipCount' | 'invitedMembershipCount' | 'multiOrgMemberCount' | 'lastOperationalActivityAt'>, referenceDate: Date): string[] {
  const reasons: string[] = []
  const activityBand = deriveOrganisationActivityBand({ lastOperationalActivityAt: entry.lastOperationalActivityAt }, referenceDate)

  if ([OrganisationStatus.Suspended, OrganisationStatus.Churned].includes(entry.organisation.status)) {
    reasons.push('Restricted tenant status')
  }

  if (entry.inactiveMembershipCount > 0 && entry.activeMembershipCount === 0) {
    reasons.push('No active membership coverage')
  }

  if (entry.invitedMembershipCount > 0 && entry.activeMembershipCount === 0) {
    reasons.push('Invite-only access posture')
  }

  if (entry.multiOrgMemberCount > 0) {
    reasons.push('Cross-tenant member overlap')
  }

  if (activityBand === 'inactive' || activityBand === 'none') {
    reasons.push('Dormant operational activity')
  }

  return reasons
}

export function deriveOrganisationLifecycle(
  entry: Pick<OrganisationRegistryEntry, 'organisation' | 'membershipCount' | 'activeMembershipCount' | 'invitedMembershipCount' | 'inactiveMembershipCount' | 'multiOrgMemberCount' | 'lastOperationalActivityAt'>,
  referenceDate: Date,
): OrganisationRegistryLifecycle {
  const createdDaysAgo = getDaysSince(entry.organisation.createdAt, referenceDate)
  const flaggedReasons = deriveOrganisationFlaggedReasons(entry, referenceDate)
  const activityBand = deriveOrganisationActivityBand({ lastOperationalActivityAt: entry.lastOperationalActivityAt }, referenceDate)

  if (flaggedReasons.length > 0 && [OrganisationStatus.Suspended, OrganisationStatus.Churned].includes(entry.organisation.status)) {
    return 'flagged'
  }

  if (createdDaysAgo !== null && createdDaysAgo <= 14 && entry.membershipCount <= 2) {
    return 'new'
  }

  if (activityBand === 'inactive' || activityBand === 'none' || (entry.activeMembershipCount === 0 && entry.invitedMembershipCount === 0)) {
    return 'dormant'
  }

  if (flaggedReasons.length > 0 && (entry.inactiveMembershipCount > 0 || entry.multiOrgMemberCount > 0 || entry.invitedMembershipCount > 0)) {
    return 'flagged'
  }

  return 'active'
}

export function enrichOrganisationRegistryEntry(
  entry: Omit<OrganisationRegistryEntry, 'activityBand' | 'membershipPosture' | 'flaggedReasons' | 'lifecycle'>,
  referenceDate: Date,
): OrganisationRegistryEntry {
  const activityBand = deriveOrganisationActivityBand(entry, referenceDate)
  const membershipPosture = deriveOrganisationMembershipPosture(entry)
  const flaggedReasons = deriveOrganisationFlaggedReasons(entry, referenceDate)
  const lifecycle = deriveOrganisationLifecycle(entry, referenceDate)

  return {
    ...entry,
    activityBand,
    membershipPosture,
    flaggedReasons,
    lifecycle,
  }
}

export function buildAdminOrganisationRegistryDomainData(entries: Omit<OrganisationRegistryEntry, 'activityBand' | 'membershipPosture' | 'flaggedReasons' | 'lifecycle'>[]): AdminOrganisationRegistryDomainData {
  const provisionalData: AdminOrganisationRegistryDomainData = {
    organisations: entries.map((entry) => ({
      ...entry,
      activityBand: 'none',
      membershipPosture: 'unassigned',
      flaggedReasons: [],
      lifecycle: 'dormant',
    })),
  }
  const referenceDate = getReferenceDate(provisionalData)

  return {
    organisations: entries.map((entry) => enrichOrganisationRegistryEntry(entry, referenceDate)),
  }
}

function matchesSearch(entry: OrganisationRegistryEntry, search?: string): boolean {
  const query = search?.trim().toLowerCase()

  if (!query) {
    return true
  }

  const haystack = [
    entry.organisation.name,
    entry.organisation.slug,
    entry.organisation.region,
    entry.organisation.status,
    entry.lifecycle,
    entry.activityBand,
    entry.membershipPosture,
    ...entry.flaggedReasons,
  ]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .toLowerCase()

  return haystack.includes(query)
}

export function matchesOrganisationLifecycle(entry: OrganisationRegistryEntry, lifecycle?: OrganisationRegistryQuery['lifecycle']): boolean {
  if (!lifecycle?.length) {
    return true
  }

  return lifecycle.includes(entry.lifecycle)
}

export function matchesOrganisationActivity(entry: OrganisationRegistryEntry, activityBand?: OrganisationRegistryQuery['activityBand']): boolean {
  if (!activityBand?.length) {
    return true
  }

  return activityBand.includes(entry.activityBand)
}

export function matchesOrganisationMembershipPosture(entry: OrganisationRegistryEntry, membershipPosture?: OrganisationRegistryQuery['membershipPosture']): boolean {
  if (!membershipPosture?.length) {
    return true
  }

  return membershipPosture.includes(entry.membershipPosture)
}

export function filterOrganisationsByQuery(entries: OrganisationRegistryEntry[], query: OrganisationRegistryQuery): OrganisationRegistryEntry[] {
  return entries.filter((entry) => (
    matchesSearch(entry, query.search)
    && matchesOrganisationLifecycle(entry, query.lifecycle)
    && matchesOrganisationActivity(entry, query.activityBand)
    && matchesOrganisationMembershipPosture(entry, query.membershipPosture)
  ))
}
