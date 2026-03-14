import Link from 'next/link'
import { clsx } from 'clsx'
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
  base: 'inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
  primary: 'bg-accent text-white shadow-[0_8px_20px_-10px_rgba(76,163,255,0.7)] hover:-translate-y-0.5 hover:bg-blue-500',
  secondary: 'border border-border/80 bg-panel text-textPrimary hover:border-accent/60 hover:bg-bg/70',
  ghost: 'text-textSecondary hover:text-textPrimary',
}

export function Button({ children, href, variant = 'primary', className, type = 'button', onClick }: ButtonProps) {
  const style = clsx(classes.base, classes[variant], className)
  if (href) return <Link href={href} className={style}>{children}</Link>
  return <button type={type} onClick={onClick} className={style}>{children}</button>
}
