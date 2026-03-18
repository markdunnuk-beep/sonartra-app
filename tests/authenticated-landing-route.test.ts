import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('authenticated sign-in and sign-up fallbacks land on dashboard helper', async () => {
  const [signInSource, signUpSource] = await Promise.all([
    readFile(new URL('../app/sign-in/[[...sign-in]]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/sign-up/[[...sign-up]]/page.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(signInSource, /getGenericAuthFallbackRedirectUrl/)
  assert.match(signUpSource, /getGenericAuthFallbackRedirectUrl/)
  assert.doesNotMatch(signInSource, /fallbackRedirectUrl="\/assessment"/)
  assert.doesNotMatch(signUpSource, /fallbackRedirectUrl="\/assessment"/)
})
