import { Assessment, AssessmentStatus, AssessmentVersion, AssessmentVersionStatus, PublishStatus } from './assessments'
import { AuditAction, AuditEntityType, AuditLogEvent } from './audit'
import { Organisation, OrganisationPlan, OrganisationStatus } from './organisations'
import { InternalAdminRole } from './roles'
import { User, UserKind, UserStatus } from './users'

export function getCurrentLiveAssessmentVersion(
  assessment: Assessment,
  versions: AssessmentVersion[],
): AssessmentVersion | null {
  const explicitLive = assessment.currentLiveVersionId
    ? versions.find((version) => version.id === assessment.currentLiveVersionId && version.assessmentId === assessment.id)
    : null

  if (explicitLive) {
    return explicitLive
  }

  return (
    versions.find(
      (version) =>
        version.assessmentId === assessment.id &&
        version.status === AssessmentVersionStatus.Live &&
        version.publishStatus === PublishStatus.Published,
    ) ?? null
  )
}

export function getAssessmentVersionCounts(assessmentId: string, versions: AssessmentVersion[]) {
  return versions.filter((version) => version.assessmentId === assessmentId).reduce(
    (counts, version) => {
      counts.total += 1
      counts[version.status] += 1
      return counts
    },
    {
      total: 0,
      [AssessmentVersionStatus.Draft]: 0,
      [AssessmentVersionStatus.InReview]: 0,
      [AssessmentVersionStatus.Validated]: 0,
      [AssessmentVersionStatus.Live]: 0,
      [AssessmentVersionStatus.Archived]: 0,
    },
  )
}

export function formatSeatUsageSummary(organisation: Organisation): string {
  const { assigned, purchased } = organisation.seatSummary
  return `${assigned}/${purchased} seats assigned`
}

export function getSeatUtilisationPercent(organisation: Organisation): number {
  if (organisation.seatSummary.purchased === 0) {
    return 0
  }

  return Math.round((organisation.seatSummary.assigned / organisation.seatSummary.purchased) * 100)
}

export function getStatusLabel(status: string): string {
  return status
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ')
}

export function groupAuditEventsByEntityType(events: AuditLogEvent[]) {
  return events.reduce<Record<AuditEntityType, AuditLogEvent[]>>(
    (groups, event) => {
      groups[event.entity.entityType].push(event)
      return groups
    },
    {
      [AuditEntityType.Organisation]: [],
      [AuditEntityType.Membership]: [],
      [AuditEntityType.User]: [],
      [AuditEntityType.Assessment]: [],
      [AuditEntityType.AssessmentVersion]: [],
      [AuditEntityType.Release]: [],
      [AuditEntityType.AdminAccess]: [],
    },
  )
}

export function getOrganisationMembershipCount(organisationId: string, users: User[]): number {
  return users.filter((user) => user.primaryOrganisationId === organisationId && user.kind === UserKind.OrganisationUser).length
}
