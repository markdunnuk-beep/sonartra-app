import assert from 'node:assert/strict'
import test from 'node:test'

import {
  AUTHENTICATED_HOME_PATH,
  formatGenericAuthRedirectOverrideWarning,
  getConfiguredGenericAuthFallbacks,
  getConflictingGenericAuthRedirectOverrides,
  getGenericAuthFallbackRedirectUrl,
} from '../lib/auth-redirects'

test('generic auth fallback is dashboard', () => {
  assert.equal(getGenericAuthFallbackRedirectUrl(), '/dashboard')
  assert.equal(AUTHENTICATED_HOME_PATH, '/dashboard')
})

test('conflicting force or after-sign-in env overrides are detected', () => {
  const overrides = getConflictingGenericAuthRedirectOverrides({
    NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: '/assessment',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/assessment',
  })

  assert.deepEqual(overrides, [
    { key: 'NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL', value: '/assessment' },
    { key: 'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL', value: '/assessment' },
  ])

  assert.match(formatGenericAuthRedirectOverrideWarning({
    NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: '/assessment',
    NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: '/assessment',
  }) ?? '', /Remove force\/after-sign-in redirect env vars/)
})

test('dashboard fallback env entries are discoverable without being treated as conflicts', () => {
  const fallbacks = getConfiguredGenericAuthFallbacks({
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: '/dashboard',
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: '/dashboard',
  })

  assert.deepEqual(fallbacks, [
    { key: 'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL', value: '/dashboard' },
    { key: 'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL', value: '/dashboard' },
  ])
  assert.equal(getConflictingGenericAuthRedirectOverrides({
    NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL: '/dashboard',
    NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL: '/dashboard',
  }).length, 0)
})
