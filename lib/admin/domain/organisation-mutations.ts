export const ADMIN_ORGANISATION_MUTABLE_STATUSES = [
  'prospect',
  'trial',
  'implementation',
  'active',
  'suspended',
  'churned',
] as const

export type AdminOrganisationMutableStatus = (typeof ADMIN_ORGANISATION_MUTABLE_STATUSES)[number]

export interface AdminOrganisationMutationState {
  status: 'idle' | 'error'
  message?: string
  fieldErrors?: Partial<Record<'name' | 'slug' | 'status' | 'country' | 'planTier' | 'seatBand' | 'confirmation', string>>
}
