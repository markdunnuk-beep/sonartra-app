import assert from 'node:assert/strict'
import test from 'node:test'
import {
  transitionAdminOrganisationStatus,
  updateAdminOrganisation,
  type AdminOrganisationFormValues,
} from '../lib/admin/server/organisation-mutations'

const baseOrganisation = {
  id: 'org-1',
  name: 'Northstar Logistics',
  slug: 'northstar-logistics',
  status: 'active',
  country: 'United Kingdom',
  plan_tier: 'growth',
  seat_band: 'scale',
  updated_at: '2026-03-20T10:00:00.000Z',
}

function buildValues(overrides: Partial<AdminOrganisationFormValues> = {}): AdminOrganisationFormValues {
  return {
    organisationId: 'org-1',
    name: 'Northstar Logistics',
    slug: 'northstar-logistics',
    status: 'active',
    country: 'United Kingdom',
    planTier: 'growth',
    seatBand: 'scale',
    expectedUpdatedAt: '2026-03-20T10:00:00.000Z',
    ...overrides,
  }
}

function createDeps(options: {
  organisation?: typeof baseOrganisation | null
  slugConflict?: boolean
  updateRow?: typeof baseOrganisation | null
  accessAllowed?: boolean
}) {
  const updates: unknown[][] = []
  const auditEvents: unknown[][] = []

  return {
    deps: {
      resolveAdminAccess: async () => ({
        isAuthenticated: true,
        isAllowed: options.accessAllowed ?? true,
        email: 'rina.patel@sonartra.com',
        allowlist: ['rina.patel@sonartra.com'],
        accessSource: 'email_allowlist' as const,
        provisionalRole: null,
        provisionalAccess: null,
      }),
      getActorIdentity: async () => ({ id: 'admin-1', email: 'rina.patel@sonartra.com', full_name: 'Rina Patel' }),
      queryDb: async (text: string) => {
        if (/from organisations\s+where id = \$1/i.test(text)) {
          return { rows: options.organisation ? [options.organisation] : [] } as never
        }

        if (/from organisations where slug = \$1 and id <> \$2/i.test(text)) {
          return { rows: options.slugConflict ? [{ id: 'org-2' }] : [] } as never
        }

        throw new Error(`Unexpected query: ${text}`)
      },
      withTransaction: async <T,>(work: (client: {
        query: (sql: string, params?: unknown[]) => Promise<{ rows: unknown[] }>
      }) => Promise<T>) => work({
        query: async (sql: string, params: unknown[] = []) => {
          if (/update organisations/i.test(sql)) {
            updates.push(params)
            return { rows: options.updateRow ? [options.updateRow] : [] }
          }

          if (/insert into access_audit_events/i.test(sql)) {
            auditEvents.push(params)
            return { rows: [] }
          }

          throw new Error(`Unexpected transactional query: ${sql}`)
        },
      } as never),
      now: () => new Date('2026-03-21T00:00:00.000Z'),
      createId: () => 'audit-event-1',
    },
    updates,
    auditEvents,
  }
}


test('edit form component and route retain current organisation values', async () => {
  const [componentSource, routeSource] = await Promise.all([
    import('node:fs/promises').then(({ readFile }) => readFile(new URL('../components/admin/surfaces/AdminOrganisationEditForm.tsx', import.meta.url), 'utf8')),
    import('node:fs/promises').then(({ readFile }) => readFile(new URL('../app/admin/organisations/[organisationId]/edit/page.tsx', import.meta.url), 'utf8')),
  ])

  assert.match(componentSource, /defaultValue=\{organisation\.name\}/)
  assert.match(componentSource, /defaultValue=\{organisation\.slug\}/)
  assert.match(componentSource, /value=\{organisation\.updatedAt\}/)
  assert.match(componentSource, /Deactivate organisation|Restore organisation/)
  assert.match(routeSource, /getAdminOrganisationDetailData/)
  assert.match(routeSource, /AdminOrganisationEditForm/)
})

test('edit form mutation succeeds and records an organisation audit event', async () => {
  const { deps, updates, auditEvents } = createDeps({
    organisation: baseOrganisation,
    updateRow: { ...baseOrganisation, name: 'Northstar Group', updated_at: '2026-03-21T00:00:00.000Z' },
  })

  const result = await updateAdminOrganisation(buildValues({ name: 'Northstar Group' }), deps as never)

  assert.equal(result.ok, true)
  assert.equal(result.code, 'updated')
  assert.equal(result.organisationId, 'org-1')
  assert.equal(updates.length, 1)
  assert.equal(auditEvents.length, 1)
  assert.match(String(auditEvents[0]?.[3]), /Organisation record updated/i)
})

test('edit mutation reports slug collisions cleanly', async () => {
  const { deps } = createDeps({ organisation: baseOrganisation, slugConflict: true })

  const result = await updateAdminOrganisation(buildValues({ slug: 'aurora-health-group' }), deps as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'slug_conflict')
  assert.equal(result.fieldErrors?.slug, 'This slug is already assigned to another organisation.')
})

test('edit mutation rejects invalid input and no-op submissions', async () => {
  const invalid = await updateAdminOrganisation(buildValues({ slug: 'Invalid Slug' }), createDeps({ organisation: baseOrganisation }).deps as never)
  const noop = await updateAdminOrganisation(buildValues(), createDeps({ organisation: baseOrganisation }).deps as never)

  assert.equal(invalid.ok, false)
  assert.equal(invalid.code, 'validation_error')
  assert.match(invalid.fieldErrors?.slug ?? '', /lowercase letters/)
  assert.equal(noop.ok, false)
  assert.equal(noop.code, 'no_op')
})

test('lifecycle mutation requires confirmation for deactivation and succeeds when confirmed', async () => {
  const missingConfirmation = await transitionAdminOrganisationStatus(
    { organisationId: 'org-1', targetStatus: 'suspended', expectedUpdatedAt: baseOrganisation.updated_at },
    createDeps({ organisation: baseOrganisation }).deps as never,
  )

  const confirmed = await transitionAdminOrganisationStatus(
    { organisationId: 'org-1', targetStatus: 'suspended', expectedUpdatedAt: baseOrganisation.updated_at, confirmation: 'confirm' },
    createDeps({ organisation: baseOrganisation, updateRow: { ...baseOrganisation, status: 'suspended' } }).deps as never,
  )

  assert.equal(missingConfirmation.ok, false)
  assert.equal(missingConfirmation.code, 'validation_error')
  assert.equal(confirmed.ok, true)
  assert.equal(confirmed.code, 'status_changed')
  assert.equal(confirmed.nextStatus, 'suspended')
})

test('mutation helpers deny access when admin guard fails', async () => {
  const { deps } = createDeps({ organisation: baseOrganisation, accessAllowed: false })
  const result = await updateAdminOrganisation(buildValues({ name: 'Northstar Group' }), deps as never)

  assert.equal(result.ok, false)
  assert.equal(result.code, 'permission_denied')
})

test('registry lifecycle mapping still reflects suspended lifecycle changes as flagged organisations', async () => {
  const { mapOrganisationRegistryDtosToDomainData } = await import('../lib/admin/server/organisation-registry-mappers')

  const data = mapOrganisationRegistryDtosToDomainData([
    {
      id: 'org-1',
      name: 'Northstar Logistics',
      slug: 'northstar-logistics',
      country: 'United Kingdom',
      status: 'suspended',
      planTier: 'growth',
      createdAt: '2026-03-01T00:00:00Z',
      updatedAt: '2026-03-21T00:00:00Z',
      membershipCount: 2,
      activeMembershipCount: 0,
      invitedMembershipCount: 1,
      inactiveMembershipCount: 1,
      ownerCount: 0,
      adminCount: 0,
      multiOrgMemberCount: 0,
      lastMembershipActivityAt: '2026-02-01T00:00:00Z',
      lastAuditActivityAt: '2026-03-21T00:00:00Z',
    },
  ])

  assert.equal(data.organisations[0]?.organisation.status, 'suspended')
  assert.equal(data.organisations[0]?.lifecycle, 'flagged')
})
