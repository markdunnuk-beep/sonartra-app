import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'

import { AdminPageHeader } from '../components/admin/AdminPageHeader'
import { AdminShellUtilityBar } from '../components/admin/AdminShellUtilityBar'
import {
  PRODUCT_USER_DASHBOARD_PATH,
  resolveAdminProductReturnDestination,
} from '../lib/admin/product-return'

test('admin product return resolver prioritises active organisation context over generic dashboard fallback', () => {
  const destination = resolveAdminProductReturnDestination({
    pathname: '/admin/organisations/org-42/edit',
    activeOrganisationId: 'org-7',
    activeOrganisationSlug: 'northstar-logistics',
  })

  assert.equal(destination.reason, 'active_tenant_context')
  assert.equal(destination.href, `${PRODUCT_USER_DASHBOARD_PATH}?organisationId=org-42`)
})

test('admin product return resolver preserves available tenant slug and workspace context when scoping from session/search state', () => {
  const destination = resolveAdminProductReturnDestination({
    pathname: '/admin/audit',
    searchParams: new URLSearchParams([
      ['workspace', 'signals'],
    ]),
    activeOrganisationId: 'org-aurora',
    activeOrganisationSlug: 'aurora-health-group',
  })

  assert.equal(destination.reason, 'active_tenant_context')
  assert.equal(
    destination.href,
    `${PRODUCT_USER_DASHBOARD_PATH}?organisationId=org-aurora&organisationSlug=aurora-health-group&workspace=signals`,
  )
})

test('admin product return resolver falls back to the authenticated user dashboard when no tenant context is available', () => {
  const destination = resolveAdminProductReturnDestination({ pathname: '/admin' })

  assert.equal(destination.reason, 'user_dashboard')
  assert.equal(destination.href, PRODUCT_USER_DASHBOARD_PATH)
})


test('admin product return resolver falls back to the public home when no product route is available', () => {
  const destination = resolveAdminProductReturnDestination({
    pathname: '/admin',
    userDashboardHref: null,
    authenticatedProductHref: null,
  })

  assert.equal(destination.reason, 'public_home')
  assert.equal(destination.href, '/')
})

test('shared admin utility bar renders the global View product control', () => {
  const html = renderToStaticMarkup(<AdminShellUtilityBar productHref="/dashboard?organisationId=org-42" />)

  assert.match(html, /View product/)
  assert.match(html, /href="\/dashboard\?organisationId=org-42"/)
})

test('deep admin pages can show both View product and the internal Dashboard control together', () => {
  const html = renderToStaticMarkup(
    <>
      <AdminShellUtilityBar productHref="/dashboard?organisationId=org-42" />
      <AdminPageHeader
        eyebrow="Organisations"
        title="Tenant detail"
        description="Operational workspace."
      />
    </>,
  )

  assert.match(html, />View product</)
  assert.match(html, />Dashboard</)
  assert.ok(html.indexOf('>View product</') < html.indexOf('>Dashboard</'))
})

test('main admin dashboard keeps View product while omitting the redundant admin self-link', () => {
  const html = renderToStaticMarkup(
    <>
      <AdminShellUtilityBar productHref="/dashboard" />
      <AdminPageHeader
        eyebrow="Administrator platform"
        title="Operational control"
        description="Main admin dashboard."
        showDashboardButton={false}
      />
    </>,
  )

  assert.match(html, />View product</)
  assert.doesNotMatch(html, />Dashboard</)
  assert.match(html, /href="\/dashboard"/)
})
