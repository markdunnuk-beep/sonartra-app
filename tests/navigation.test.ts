import assert from 'node:assert/strict';
import test from 'node:test';

import { getSidebarLinks } from '../lib/navigation';

test('sidebar links hide individual results when user has no completed assessment', () => {
  const labels = getSidebarLinks(false).map((link) => link.label);

  assert.deepEqual(labels, ['Dashboard', 'Assessment', 'Organisation', 'Settings']);
});

test('sidebar links include individual results when user has completed assessment', () => {
  const labels = getSidebarLinks(true).map((link) => link.label);

  assert.deepEqual(labels, ['Dashboard', 'Assessment', 'Individual Results', 'Organisation', 'Settings']);
});

test('organisation link remains visible and locked while reports stay hidden', () => {
  const links = getSidebarLinks(true);
  const organisationLink = links.find((link) => link.label === 'Organisation');
  const reportsLink = links.find((link) => link.label === 'Reports');

  assert.equal(Boolean(organisationLink), true);
  assert.equal(organisationLink?.locked, true);
  assert.equal(reportsLink, undefined);
});
