import { AppShell } from '@/components/layout/AppShell'
import { Card } from '@/components/ui/Card'

function LoadingPulse({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-full bg-white/[0.08] ${className}`} />
}

export default function Loading() {
  return (
    <AppShell>
      <div className="pb-12 pt-8">
        <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
          <Card className="overflow-hidden border-white/[0.08] bg-[linear-gradient(180deg,rgba(14,20,30,0.98),rgba(10,15,24,0.96))] px-6 py-6 sm:px-8 sm:py-7">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <LoadingPulse className="h-7 w-28" />
                <LoadingPulse className="h-7 w-36" />
                <LoadingPulse className="h-7 w-40" />
              </div>
              <LoadingPulse className="h-10 w-3/4 max-w-[520px]" />
              <LoadingPulse className="h-5 w-full max-w-[760px]" />
            </div>
          </Card>

          <Card className="border-accent/15 bg-panel/[0.9]">
            <div className="space-y-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    <LoadingPulse className="h-7 w-32" />
                    <LoadingPulse className="h-7 w-44" />
                    <LoadingPulse className="h-7 w-36" />
                  </div>
                  <LoadingPulse className="h-8 w-72" />
                  <LoadingPulse className="h-5 w-full max-w-[620px]" />
                </div>
                <LoadingPulse className="h-12 w-full max-w-[180px]" />
              </div>

              <div className="space-y-5 border-t border-white/[0.06] pt-6">
                <LoadingPulse className="h-20 w-full rounded-[1.2rem]" />
                <LoadingPulse className="h-64 w-full rounded-[1.5rem]" />
                <LoadingPulse className="h-72 w-full rounded-[1.5rem]" />
              </div>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  )
}
