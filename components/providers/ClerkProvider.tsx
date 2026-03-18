'use client'

import React, { useEffect } from 'react'
import { ClerkProvider as ClerkRootProvider } from '@clerk/nextjs'
import { ReactNode } from 'react'

import { formatGenericAuthRedirectOverrideWarning, getGenericAuthFallbackRedirectUrl } from '@/lib/auth-redirects'

const fallbackPublishableKey = 'pk_test_c29uYXJ0cmEuY2xlcmsuYWNjb3VudHMuZGV2JA'

export function ClerkProvider({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? fallbackPublishableKey
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
