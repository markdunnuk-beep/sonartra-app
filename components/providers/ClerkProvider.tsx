'use client'

import React, { type ReactNode, useEffect } from 'react'
import { ClerkProvider as ClerkRootProvider } from '@clerk/nextjs'

import {
  formatGenericAuthRedirectOverrideWarning,
  getGenericAuthFallbackRedirectUrl,
} from '@/lib/auth-redirects'

function getClerkPublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.trim() || null
}

export function ClerkProvider({ children }: { children: ReactNode }) {
  const publishableKey = getClerkPublishableKey()
  const fallbackRedirectUrl = getGenericAuthFallbackRedirectUrl()

  useEffect(() => {
    if (!publishableKey) {
      console.warn('Missing NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY; rendering without Clerk provider.')
      return
    }

    const warning = formatGenericAuthRedirectOverrideWarning()

    if (warning) {
      console.warn(warning)
    }
  }, [publishableKey])

  if (!publishableKey) {
    return <>{children}</>
  }

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
