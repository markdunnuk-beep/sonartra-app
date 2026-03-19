import React from 'react'
import { clsx } from 'clsx'
import { type HTMLAttributes } from 'react'
import { type ReactNode } from 'react'

type CardProps = {
  children: ReactNode
  className?: string
  interactive?: boolean
} & HTMLAttributes<HTMLDivElement>

export function Card({ children, className, interactive = false, ...props }: CardProps) {
  return (
    <div
      {...props}
      className={clsx(
        'surface relative overflow-hidden px-5 py-5 sm:px-6 sm:py-6',
        interactive && 'interactive-surface',
        'before:pointer-events-none before:absolute before:inset-0 before:bg-[linear-gradient(180deg,rgba(255,255,255,0.028),transparent_30%)]',
        className,
      )}
    >
      <div className="relative">{children}</div>
    </div>
  )
}
