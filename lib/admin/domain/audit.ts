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

export const ADMIN_AUDIT_ENTITY_TYPES = ['organisation', 'membership', 'user', 'assessment', 'assessment_version', 'admin_access'] as const
export type AdminAuditEntityType = (typeof ADMIN_AUDIT_ENTITY_TYPES)[number]

export const ADMIN_AUDIT_SOURCES = ['audit', 'membership', 'organisation'] as const
export type AdminAuditSource = (typeof ADMIN_AUDIT_SOURCES)[number]

export const DEFAULT_ADMIN_AUDIT_PAGE_SIZE = 25

export interface AdminAuditFilters {
  organisationId: string
  actorId: string
  entityType: 'all' | AdminAuditEntityType
  entityId: string
  eventType: string
  dateFrom: string
  dateTo: string
  query: string
  page: number
  pageSize: number
}

export interface AdminAuditActorOption {
  id: string
  label: string
}

export interface AdminAuditOrganisationOption {
  id: string
  label: string
}

export interface AdminAuditEventRecord {
  id: string
  eventType: string
  eventLabel: string
  summary: string
  actorId: string | null
  actorName: string | null
  happenedAt: string
  source: AdminAuditSource
  organisationId: string | null
  organisationName: string | null
  entityType: AdminAuditEntityType
  entityId: string | null
  entityName: string | null
  entitySecondary: string | null
  isDerived: boolean
}

export interface AdminAuditAppliedFilter {
  key: keyof Omit<AdminAuditFilters, 'page' | 'pageSize'>
  label: string
  value: string
}

export interface AdminAuditPagination {
  page: number
  pageSize: number
  totalCount: number
  totalPages: number
  hasPreviousPage: boolean
  hasNextPage: boolean
  windowStart: number
  windowEnd: number
}

export interface AdminAuditWorkspaceData {
  filters: AdminAuditFilters
  events: AdminAuditEventRecord[]
  pagination: AdminAuditPagination
  availableActors: AdminAuditActorOption[]
  availableOrganisations: AdminAuditOrganisationOption[]
  availableEventTypes: string[]
  appliedFilters: AdminAuditAppliedFilter[]
}

type AuditSearchParams = Record<string, string | string[] | undefined> | undefined

function normaliseSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) {
    return value[0]?.trim() ?? ''
  }

  return value?.trim() ?? ''
}

function parsePositiveInteger(value: string, fallback: number): number {
  if (!value) {
    return fallback
  }

  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function isKnownEntityType(value: string): value is AdminAuditEntityType {
  return ADMIN_AUDIT_ENTITY_TYPES.includes(value as AdminAuditEntityType)
}

export function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function getAdminAuditFilters(searchParams?: AuditSearchParams): AdminAuditFilters {
  const organisationId = normaliseSingleValue(searchParams?.organisationId)
  const actorId = normaliseSingleValue(searchParams?.actorId)
  const entityType = normaliseSingleValue(searchParams?.entityType)
  const entityId = normaliseSingleValue(searchParams?.entityId)
  const eventType = normaliseSingleValue(searchParams?.eventType)
  const dateFrom = normaliseSingleValue(searchParams?.dateFrom)
  const dateTo = normaliseSingleValue(searchParams?.dateTo)
  const query = normaliseSingleValue(searchParams?.query)
  const page = parsePositiveInteger(normaliseSingleValue(searchParams?.page), 1)

  return {
    organisationId: isUuidLike(organisationId) ? organisationId : '',
    actorId: isUuidLike(actorId) ? actorId : '',
    entityType: isKnownEntityType(entityType) ? entityType : 'all',
    entityId,
    eventType,
    dateFrom,
    dateTo,
    query,
    page,
    pageSize: DEFAULT_ADMIN_AUDIT_PAGE_SIZE,
  }
}

export function getAdminAuditEventLabel(eventType: string): string {
  const cleaned = eventType.replace(/[_-]+/g, ' ').trim()

  if (!cleaned) {
    return 'Unknown event'
  }

  return cleaned.replace(/\b\w/g, (character) => character.toUpperCase())
}

export function getAdminAuditEntityTypeLabel(entityType: AdminAuditEntityType): string {
  switch (entityType) {
    case 'admin_access':
      return 'Admin access'
    case 'assessment':
      return 'Assessment'
    case 'assessment_version':
      return 'Assessment version'
    case 'membership':
      return 'Membership'
    case 'organisation':
      return 'Organisation'
    case 'user':
      return 'User'
  }
}

export function getAdminAuditEventTone(eventType: string, source: AdminAuditSource): 'slate' | 'sky' | 'emerald' | 'amber' | 'rose' {
  if (source === 'organisation') {
    return 'sky'
  }

  if (/invite|pending/i.test(eventType)) {
    return 'amber'
  }

  if (/suspend|remove|deactiv|dormant|flag|review/i.test(eventType)) {
    return 'rose'
  }

  if (/sign_in|created|joined|reactivat|checkpoint|confirm|updated/i.test(eventType)) {
    return 'sky'
  }

  if (/publish|validated|completed/i.test(eventType)) {
    return 'emerald'
  }

  return 'slate'
}

export function getAdminAuditAppliedFilters(
  filters: AdminAuditFilters,
  lookups?: {
    actors?: AdminAuditActorOption[]
    organisations?: AdminAuditOrganisationOption[]
  },
): AdminAuditAppliedFilter[] {
  const actorLabel = lookups?.actors?.find((actor) => actor.id === filters.actorId)?.label ?? filters.actorId
  const organisationLabel = lookups?.organisations?.find((organisation) => organisation.id === filters.organisationId)?.label ?? filters.organisationId

  return [
    filters.organisationId ? { key: 'organisationId', label: 'Organisation', value: organisationLabel } : null,
    filters.actorId ? { key: 'actorId', label: 'Actor', value: actorLabel } : null,
    filters.entityType !== 'all' ? { key: 'entityType', label: 'Entity type', value: getAdminAuditEntityTypeLabel(filters.entityType) } : null,
    filters.entityId ? { key: 'entityId', label: 'Entity ID', value: filters.entityId } : null,
    filters.eventType ? { key: 'eventType', label: 'Event type', value: getAdminAuditEventLabel(filters.eventType) } : null,
    filters.dateFrom ? { key: 'dateFrom', label: 'From', value: filters.dateFrom } : null,
    filters.dateTo ? { key: 'dateTo', label: 'To', value: filters.dateTo } : null,
    filters.query ? { key: 'query', label: 'Query', value: filters.query } : null,
  ].filter((value): value is AdminAuditAppliedFilter => Boolean(value))
}

export function buildAdminAuditHref(
  filters: Partial<AdminAuditFilters> = {},
  pathname = '/admin/audit',
): string {
  const params = new URLSearchParams()

  if (filters.organisationId) {
    params.set('organisationId', filters.organisationId)
  }

  if (filters.actorId) {
    params.set('actorId', filters.actorId)
  }

  if (filters.entityType && filters.entityType !== 'all') {
    params.set('entityType', filters.entityType)
  }

  if (filters.entityId) {
    params.set('entityId', filters.entityId)
  }

  if (filters.eventType) {
    params.set('eventType', filters.eventType)
  }

  if (filters.dateFrom) {
    params.set('dateFrom', filters.dateFrom)
  }

  if (filters.dateTo) {
    params.set('dateTo', filters.dateTo)
  }

  if (filters.query) {
    params.set('query', filters.query)
  }

  if (filters.page && filters.page > 1) {
    params.set('page', String(filters.page))
  }

  const query = params.toString()
  return query ? `${pathname}?${query}` : pathname
}
