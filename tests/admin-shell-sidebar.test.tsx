import assert from 'node:assert/strict'
import test from 'node:test'
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import TestRenderer, { act } from 'react-test-renderer'

import { ProvisionalAdminRole } from '../lib/admin/domain'
import { getAdminNavigationItems } from '../lib/admin/navigation'
import {
  ADMIN_SIDEBAR_STORAGE_KEY,
  parseAdminSidebarPreference,
  serializeAdminSidebarPreference,
  useAdminSidebarPreference,
} from '../lib/admin/sidebar-state'

const access = {
  isAuthenticated: true,
  isAllowed: true,
  email: 'ops@sonartra.com',
  allowlist: ['ops@sonartra.com'],
  accessSource: 'email_allowlist' as const,
  provisionalRole: ProvisionalAdminRole.InternalAdmin,
  provisionalAccess: {
    role: ProvisionalAdminRole.InternalAdmin,
    rationale: 'bootstrap_allowlist' as const,
  },
}

function installWindow(initialValue: string | null = null) {
  const storage = new Map<string, string>()

  if (initialValue !== null) {
    storage.set(ADMIN_SIDEBAR_STORAGE_KEY, initialValue)
  }

  const localStorage = {
    getItem(key: string) {
      return storage.has(key) ? storage.get(key)! : null
    },
    setItem(key: string, value: string) {
      storage.set(key, value)
    },
    removeItem(key: string) {
      storage.delete(key)
    },
    clear() {
      storage.clear()
    },
    key(index: number) {
      return Array.from(storage.keys())[index] ?? null
    },
    get length() {
      return storage.size
    },
  }

  ;(globalThis as typeof globalThis & { window?: Window & typeof globalThis; self?: Window & typeof globalThis }).window = {
    localStorage,
  } as Window & typeof globalThis
  ;(globalThis as typeof globalThis & { self?: Window & typeof globalThis }).self = globalThis.window

  return storage
}

function SidebarPreferenceHarness() {
  const { isCollapsed, hasHydrated, toggleCollapsed } = useAdminSidebarPreference()

  return (
    <button type="button" data-collapsed={isCollapsed ? 'true' : 'false'} data-hydrated={hasHydrated ? 'true' : 'false'} onClick={toggleCollapsed}>
      Toggle sidebar
    </button>
  )
}

test('sidebar preference parser defaults to expanded state and serializes deterministically', () => {
  assert.equal(parseAdminSidebarPreference(null), false)
  assert.equal(parseAdminSidebarPreference('false'), false)
  assert.equal(parseAdminSidebarPreference('true'), true)
  assert.equal(serializeAdminSidebarPreference(false), 'false')
  assert.equal(serializeAdminSidebarPreference(true), 'true')
})

test('admin shell defaults to expanded navigation and exposes the shared header toggle on admin pages', async () => {
  installWindow()

  const { AdminShell } = await import('../components/admin/AdminShell')
  const html = renderToStaticMarkup(
    <AdminShell
      access={access}
      navigationItems={getAdminNavigationItems(access)}
      currentPathname="/admin/dashboard"
      productHref="/dashboard?organisationId=org-42"
      brandLogo={<span>Brand</span>}
    >
      <div>Dashboard content</div>
    </AdminShell>,
  )

  assert.match(html, /data-sidebar-collapsed="false"/)
  assert.match(html, /Collapse admin sidebar/)
  assert.match(html, /View product/)
  assert.match(html, /href="\/admin\/organisations"/)
})

test('sidebar preference hook hydrates persisted state and saves toggle updates locally', async () => {
  const storage = installWindow('true')
  const renderer = TestRenderer.create(<SidebarPreferenceHarness />)

  await act(async () => {})

  const toggle = renderer.root.findByType('button')
  assert.equal(toggle.props['data-hydrated'], 'true')
  assert.equal(toggle.props['data-collapsed'], 'true')
  assert.equal(storage.get(ADMIN_SIDEBAR_STORAGE_KEY), 'true')

  await act(async () => {
    toggle.props.onClick()
  })

  assert.equal(renderer.root.findByType('button').props['data-collapsed'], 'false')
  assert.equal(storage.get(ADMIN_SIDEBAR_STORAGE_KEY), 'false')
})

test('collapsed admin sidebar keeps active navigation links accessible through icon rail affordances', async () => {
  const { AdminSidebar } = await import('../components/admin/AdminSidebar')
  const html = renderToStaticMarkup(
    <AdminSidebar access={access} navigationItems={getAdminNavigationItems(access)} isCollapsed currentPathname="/admin/users/abc" brandLogo={<span>Brand</span>} />,
  )

  assert.match(html, /data-sidebar-state="collapsed"/)
  assert.match(html, /href="\/admin\/users"/)
  assert.match(html, /title="Users"/)
  assert.match(html, /aria-label="Users"/)
  assert.match(html, /data-active="true"/)
  assert.match(html, /min-w-0 flex-1 hidden/)
})
