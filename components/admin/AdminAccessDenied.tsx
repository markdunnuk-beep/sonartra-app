import Link from 'next/link'
import { ShieldAlert } from 'lucide-react'
import { Card } from '@/components/ui/Card'

export function AdminAccessDenied({ email, allowlistConfigured }: { email: string | null; allowlistConfigured: boolean }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-3xl items-center px-6 py-16">
      <Card className="w-full px-7 py-7 sm:px-8 sm:py-8">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl border border-amber-300/20 bg-amber-300/10 p-3 text-amber-100">
            <ShieldAlert className="h-6 w-6" />
          </div>
          <div className="space-y-4">
            <div>
              <p className="eyebrow">Restricted area</p>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight text-textPrimary">Admin access is not enabled for this account.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-textSecondary">
                Sonartra admin routes are reserved for internal operators responsible for assessment governance,
                tenant controls, and release oversight.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border/80 bg-bg/55 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Signed in as</p>
                <p className="mt-2 text-sm font-medium text-textPrimary">{email ?? 'Unknown user'}</p>
              </div>
              <div className="rounded-2xl border border-border/80 bg-bg/55 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Configuration</p>
                <p className="mt-2 text-sm font-medium text-textPrimary">
                  {allowlistConfigured ? 'Admin allowlist detected' : 'No admin allowlist configured'}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="interaction-control inline-flex items-center rounded-xl border border-border/80 bg-bg/80 px-4 py-2 text-sm font-medium text-textPrimary hover:border-accent/35 hover:text-accent">
                Return to workspace
              </Link>
              <Link href="mailto:security@sonartra.com" className="interaction-control inline-flex items-center rounded-xl border border-accent/30 bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:border-accent/45 hover:text-[#9fcbff]">
                Request internal access
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
