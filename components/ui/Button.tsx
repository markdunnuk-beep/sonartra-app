import React from 'react'
import { clsx } from 'clsx'
import Link from 'next/link'
import { type MouseEventHandler, type ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  type?: 'button' | 'submit'
  onClick?: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
}

const classes = {
  base: 'interaction-control inline-flex min-h-10 items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium tracking-[0.01em] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-55',
  primary:
    'border border-accent/60 bg-accent text-[#031126] shadow-[0_12px_24px_-18px_rgba(76,159,255,0.75)] hover:border-[#8ac1ff] hover:bg-[#79B6FF] hover:shadow-[0_18px_30px_-22px_rgba(82,163,255,0.72)] active:translate-y-0',
  secondary: 'border border-white/[0.1] bg-panel/70 text-textPrimary hover:border-accent/35 hover:bg-[#122033] hover:text-[#e5eefc] active:bg-panel/80',
  ghost: 'border border-transparent bg-transparent text-textSecondary hover:border-white/[0.08] hover:bg-panel/45 hover:text-textPrimary',
}

export function Button({ children, href, variant = 'primary', className, type = 'button', onClick, disabled }: ButtonProps) {
  const style = clsx(classes.base, classes[variant], className)
  if (href) {
    return (
      <Link href={href} aria-disabled={disabled} className={clsx(style, disabled && 'pointer-events-none')}>
        {children}
      </Link>
    )
  }

  return (
    <button type={type} onClick={onClick} className={style} disabled={disabled}>
      {children}
    </button>
  )
}
