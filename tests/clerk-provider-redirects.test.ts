import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('clerk provider sets dashboard fallback redirects for generic auth completions', async () => {
  const source = await readFile(new URL('../components/providers/ClerkProvider.tsx', import.meta.url), 'utf8')

  assert.doesNotMatch(source, /fallbackPublishableKey/)
  assert.match(source, /throw new Error\('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY'\)/)
  assert.match(source, /signInFallbackRedirectUrl=\{fallbackRedirectUrl\}/)
  assert.match(source, /signUpFallbackRedirectUrl=\{fallbackRedirectUrl\}/)
  assert.match(source, /formatGenericAuthRedirectOverrideWarning/)
})
