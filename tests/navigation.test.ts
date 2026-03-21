import assert from 'node:assert/strict';
import test from 'node:test';

import { canonicalAdminLandingHref } from '../lib/admin/navigation'
import { getSidebarLinks } from '../lib/navigation';

test('sidebar links hide individual results when user has no completed assessment', () => {
  const labels = getSidebarLinks(false).map((link) => link.label);

  assert.deepEqual(labels, ['Dashboard', 'Assessment', 'Organisation', 'Settings']);
});

test('sidebar links include individual results when user has completed assessment', () => {
  const labels = getSidebarLinks(true).map((link) => link.label);

  assert.deepEqual(labels, ['Dashboard', 'Assessment', 'Individual Results', 'Organisation', 'Settings']);
});

test('admin users see the admin link in the primary signed-in navigation', () => {
  const links = getSidebarLinks(true, canonicalAdminLandingHref)
  const labels = links.map((link) => link.label)
  const adminLink = links.find((link) => link.label === 'Admin')

  assert.deepEqual(labels, ['Dashboard', 'Assessment', 'Individual Results', 'Admin', 'Organisation', 'Settings'])
  assert.equal(adminLink?.href, canonicalAdminLandingHref)
  assert.equal(adminLink?.startsWith, canonicalAdminLandingHref)
})

test('non-admin users do not see the admin link in the primary signed-in navigation', () => {
  const adminLink = getSidebarLinks(true, null).find((link) => link.label === 'Admin')

  assert.equal(adminLink, undefined)
})

test('organisation link remains visible and locked while reports stay hidden', () => {
  const links = getSidebarLinks(true);
  const organisationLink = links.find((link) => link.label === 'Organisation');
  const reportsLink = links.find((link) => link.label === 'Reports');

  assert.equal(Boolean(organisationLink), true);
  assert.equal(organisationLink?.locked, true);
  assert.equal(reportsLink, undefined);
});
