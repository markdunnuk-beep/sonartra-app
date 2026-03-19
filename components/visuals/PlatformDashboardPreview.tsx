const metrics = [
  { label: 'Leadership Architecture', value: 82 },
  { label: 'Decision Risk Flags', value: 34 },
  { label: 'Culture Alignment', value: 76 },
]

export function PlatformDashboardPreview() {
  return (
    <div className="visual-shell visual-grid-overlay interactive-surface dashboard-preview relative rounded-[1.375rem] p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Executive Intelligence Console</p>
        <span className="live-indicator rounded-full border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[9px] uppercase tracking-[0.14em] text-[#7f93af]">
          live telemetry
        </span>
      </div>

      <div className="dashboard-scan" aria-hidden />

      <div className="mt-5 grid gap-4 md:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-[1rem] border border-white/[0.08] bg-[#0e1827]/78 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9eb2cd]">Behavioural Radar</p>
          <svg viewBox="0 0 220 180" className="mt-2 h-40 w-full">
            {[26, 46, 66].map((r) => <circle key={r} cx="90" cy="92" r={r} className="fill-none stroke-white/12" />)}
            <path d="M90 36 L132 68 L126 116 L80 146 L46 104 L56 64 Z" className="fill-accent/14 stroke-accent/45" />
            <line x1="90" y1="92" x2="90" y2="36" className="stroke-white/24" />
            <line x1="90" y1="92" x2="132" y2="68" className="stroke-white/24" />
            <line x1="90" y1="92" x2="126" y2="116" className="stroke-white/24" />
            <line x1="90" y1="92" x2="80" y2="146" className="stroke-white/24" />
            <line x1="90" y1="92" x2="46" y2="104" className="stroke-white/24" />
            <line x1="90" y1="92" x2="56" y2="64" className="stroke-white/24" />
          </svg>
        </div>

        <div className="space-y-3 rounded-[1rem] border border-white/[0.08] bg-[#0e1827]/78 p-4">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="flex justify-between text-xs text-[#a9bdd8]">
                <span>{metric.label}</span>
                <span>{metric.value}</span>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-white/8">
                <div className="h-full rounded-full bg-accent/65" style={{ width: `${metric.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
