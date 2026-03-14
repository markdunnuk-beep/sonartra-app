import { InputHTMLAttributes } from 'react'

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="w-full rounded-lg border border-border bg-transparent px-3 py-2 text-sm text-textPrimary outline-none ring-accent/40 placeholder:text-textSecondary focus:ring" />
}
