export const AUTHENTICATED_HOME_PATH = '/dashboard'

const GENERIC_AUTH_FALLBACK_ENV_KEYS = [
  'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL',
] as const

const GENERIC_AUTH_OVERRIDE_ENV_KEYS = [
  'NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
] as const

export interface AuthRedirectEnvEntry {
  key: (typeof GENERIC_AUTH_FALLBACK_ENV_KEYS)[number] | (typeof GENERIC_AUTH_OVERRIDE_ENV_KEYS)[number]
  value: string
}

export function getGenericAuthFallbackRedirectUrl(): string {
  return AUTHENTICATED_HOME_PATH
}

export function getConfiguredGenericAuthFallbacks(env: Record<string, string | undefined> = process.env): AuthRedirectEnvEntry[] {
  return GENERIC_AUTH_FALLBACK_ENV_KEYS.flatMap((key) => {
    const value = env[key]?.trim()
    return value ? [{ key, value }] : []
  })
}

export function getConflictingGenericAuthRedirectOverrides(env: Record<string, string | undefined> = process.env): AuthRedirectEnvEntry[] {
  return GENERIC_AUTH_OVERRIDE_ENV_KEYS.flatMap((key) => {
    const value = env[key]?.trim()
    return value ? [{ key, value }] : []
  })
}

export function formatGenericAuthRedirectOverrideWarning(env: Record<string, string | undefined> = process.env): string | null {
  const overrides = getConflictingGenericAuthRedirectOverrides(env)

  if (overrides.length === 0) {
    return null
  }

  const formattedOverrides = overrides.map(({ key, value }) => `${key}=${value}`).join(', ')

  return `Clerk generic auth redirect overrides detected (${formattedOverrides}). Remove force/after-sign-in redirect env vars to preserve deep-link returns and let generic auth fall back to ${AUTHENTICATED_HOME_PATH}.`
}
