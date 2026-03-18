import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

test('authenticated sign-in and sign-up fallbacks land on dashboard', async () => {
  const [signInSource, signUpSource] = await Promise.all([
    readFile(new URL('../app/sign-in/[[...sign-in]]/page.tsx', import.meta.url), 'utf8'),
    readFile(new URL('../app/sign-up/[[...sign-up]]/page.tsx', import.meta.url), 'utf8'),
  ])

  assert.match(signInSource, /fallbackRedirectUrl="\/dashboard"/)
  assert.doesNotMatch(signInSource, /fallbackRedirectUrl="\/assessment"/)
  assert.match(signUpSource, /fallbackRedirectUrl="\/dashboard"/)
  assert.doesNotMatch(signUpSource, /fallbackRedirectUrl="\/assessment"/)
})
