import { clsx } from 'clsx'
import Link from 'next/link'
import { ReactNode } from 'react'

type ButtonProps = {
  children: ReactNode
  href?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  className?: string
  type?: 'button' | 'submit'
  onClick?: () => void
}

const classes = {
  base: 'inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-55',
  primary:
    'border border-accent/70 bg-accent text-white shadow-[0_10px_24px_-14px_rgba(76,163,255,0.8)] hover:-translate-y-0.5 hover:bg-blue-500 active:translate-y-0',
  secondary: 'border border-border/80 bg-panel text-textPrimary hover:border-accent/50 hover:bg-bg/70 active:bg-bg/80',
  ghost: 'border border-transparent text-textSecondary hover:border-border/70 hover:text-textPrimary',
}

export function Button({ children, href, variant = 'primary', className, type = 'button', onClick }: ButtonProps) {
  const style = clsx(classes.base, classes[variant], className)
  if (href)
    return (
      <Link href={href} className={style}>
        {children}
      </Link>
    )

  return (
    <button type={type} onClick={onClick} className={style}>
      {children}
    </button>
  )
}
