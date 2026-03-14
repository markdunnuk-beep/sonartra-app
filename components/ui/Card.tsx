import { ReactNode } from 'react'
import { clsx } from 'clsx'

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('panel p-5 sm:p-6', className)}>{children}</div>
}
