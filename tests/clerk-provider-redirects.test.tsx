import assert from 'node:assert/strict'
import test from 'node:test'

import { ClerkProvider } from '../components/providers/ClerkProvider'

test('clerk provider sets dashboard fallback redirects for generic auth completions', () => {
  const element = ClerkProvider({ children: null })

  assert.equal(element.props.signInFallbackRedirectUrl, '/dashboard')
  assert.equal(element.props.signUpFallbackRedirectUrl, '/dashboard')
})
