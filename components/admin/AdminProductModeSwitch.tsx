import React from 'react'
import { ArrowUpRight } from 'lucide-react'
import { Button } from '@/components/ui/Button'

export function AdminProductModeSwitch({ href }: { href: string }) {
  return (
    <Button href={href} variant="ghost" className="min-h-9 rounded-full border border-border/80 bg-bg/50 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary hover:border-border hover:bg-panel/50 hover:text-textPrimary">
      View product
      <ArrowUpRight className="ml-1.5 h-3.5 w-3.5" />
    </Button>
  )
}
