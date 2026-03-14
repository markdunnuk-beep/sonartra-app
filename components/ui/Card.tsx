import { ReactNode } from 'react'
import { clsx } from 'clsx'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-2xl border border-border/80 bg-panel/90 p-5 shadow-panel backdrop-blur-sm sm:p-6', className)}>
      {children}
    </div>
  )
}
