'use client'

import { usePathname, useSearchParams } from 'next/navigation'
import { AdminShellUtilityBar } from '@/components/admin/AdminShellUtilityBar'
import { resolveAdminProductReturnDestination } from '@/lib/admin/product-return'

export function AdminShellProductModeSwitch() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const destination = resolveAdminProductReturnDestination({ pathname, searchParams })

  return <AdminShellUtilityBar productHref={destination.href} />
}
