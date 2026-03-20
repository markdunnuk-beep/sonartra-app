export interface AccessQuery {
  search?: string
  scope?: 'all' | 'internal' | 'organisation' | 'multi_org'
  roleTypes?: string[]
  status?: ('active' | 'inactive' | 'suspended' | 'invited')[]
  activityBand?: ('active_now' | 'recent' | 'inactive')[]
  riskFlags?: (
    | 'elevated_access'
    | 'multi_org'
    | 'invite_pending'
    | 'internal_review'
    | 'no_recent_activity'
  )[]
}

export const DEFAULT_ACCESS_QUERY: AccessQuery = {
  scope: 'all',
}
