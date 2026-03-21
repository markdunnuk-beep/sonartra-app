import React from 'react'
import { AdminProductModeSwitch } from '@/components/admin/AdminProductModeSwitch'

export function AdminShellUtilityBar({ productHref }: { productHref: string }) {
  return <AdminProductModeSwitch href={productHref} />
}
