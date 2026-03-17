'use client'

import { ClerkProvider as ClerkRootProvider } from '@clerk/nextjs'
import { ReactNode } from 'react'

const fallbackPublishableKey = 'pk_test_c29uYXJ0cmEuY2xlcmsuYWNjb3VudHMuZGV2JA'

export function ClerkProvider({ children }: { children: ReactNode }) {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? fallbackPublishableKey

  return <ClerkRootProvider publishableKey={publishableKey}>{children}</ClerkRootProvider>
}
