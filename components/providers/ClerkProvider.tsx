'use client'

import React, { useEffect } from 'react'
import { ClerkProvider as ClerkRootProvider } from '@clerk/nextjs'
import { ReactNode } from 'react'

import { formatGenericAuthRedirectOverrideWarning, getGenericAuthFallbackRedirectUrl } from '@/lib/auth-redirects'

function getClerkPublishableKey() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim()

  if (!publishableKey) {
    throw new Error('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY')
  }

  return publishableKey
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  // Silent fallback keys are intentionally disallowed because they can mask bad env config,
  // trigger Clerk instance/domain mismatches, and cause server-side auth failures.
  const publishableKey = getClerkPublishableKey()
  const fallbackRedirectUrl = getGenericAuthFallbackRedirectUrl()

  useEffect(() => {
    const warning = formatGenericAuthRedirectOverrideWarning()

    if (warning) {
      console.warn(warning)
    }
  }, [])

  return (
    <ClerkRootProvider
      publishableKey={publishableKey}
      signInFallbackRedirectUrl={fallbackRedirectUrl}
      signUpFallbackRedirectUrl={fallbackRedirectUrl}
    >
      {children}
    </ClerkRootProvider>
  )
}
