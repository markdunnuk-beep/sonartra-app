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
    'border border-accent/70 bg-accent text-[#031126] shadow-[0_12px_28px_-16px_rgba(76,159,255,0.95)] hover:border-[#8ac1ff] hover:bg-[#79B6FF] hover:shadow-[0_18px_34px_-20px_rgba(82,163,255,0.95)] active:translate-y-0',
  secondary: 'border border-border/90 bg-panel/90 text-textPrimary hover:border-accent/55 hover:bg-[#111f33] hover:text-[#e5eefc] active:bg-panel/80',
  ghost: 'border border-transparent bg-transparent text-textSecondary hover:border-border/70 hover:bg-panel/60 hover:text-textPrimary',
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
