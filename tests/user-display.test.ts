import assert from 'node:assert/strict';
import test from 'node:test';

import { deriveUserDisplayName } from '../lib/user-display';

test('deriveUserDisplayName prefers full name when available', () => {
  const displayName = deriveUserDisplayName({ firstName: 'Mark', lastName: 'Dunn', emailAddress: 'mark@example.com' });

  assert.equal(displayName, 'Mark Dunn');
});

test('deriveUserDisplayName falls back to first name', () => {
  const displayName = deriveUserDisplayName({ firstName: 'Mark', emailAddress: 'mark@example.com' });

  assert.equal(displayName, 'Mark');
});

test('deriveUserDisplayName falls back to email then generic label', () => {
  const emailFallback = deriveUserDisplayName({ emailAddress: 'mark@example.com' });
  const genericFallback = deriveUserDisplayName({});

  assert.equal(emailFallback, 'mark@example.com');
  assert.equal(genericFallback, 'Authenticated user');
});
