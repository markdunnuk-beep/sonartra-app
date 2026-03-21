import React from 'react'
import { AdminProductModeSwitch } from '@/components/admin/AdminProductModeSwitch'

export function AdminShellUtilityBar({ productHref }: { productHref: string }) {
  return (
    <div className="mb-5 flex items-center justify-end sm:mb-6">
      <AdminProductModeSwitch href={productHref} />
    </div>
  )
}
