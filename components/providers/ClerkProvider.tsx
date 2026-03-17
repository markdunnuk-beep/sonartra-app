'use client';

import { ClerkProvider as ClerkRootProvider } from '@clerk/nextjs';
import { ReactNode } from 'react';

export function ClerkProvider({ children }: { children: ReactNode }) {
  return <ClerkRootProvider>{children}</ClerkRootProvider>;
}
