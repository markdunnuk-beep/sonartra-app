const metrics = [
  { label: 'Leadership Architecture', value: 82 },
  { label: 'Decision Risk Flags', value: 34 },
  { label: 'Culture Alignment', value: 76 },
]

export function PlatformDashboardPreview() {
  return (
    <div className="visual-shell visual-grid-overlay rounded-2xl p-5">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Executive Intelligence Console</p>
        <span className="rounded-full border border-accent/35 bg-accent/10 px-2 py-1 text-[10px] uppercase tracking-[0.16em] text-[#afd0ff]">
          live telemetry
        </span>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border border-white/10 bg-[#0e1827]/85 p-4">
          <p className="text-xs uppercase tracking-[0.16em] text-[#9eb2cd]">Behavioural Radar</p>
          <svg viewBox="0 0 220 180" className="mt-2 h-40 w-full">
            {[26, 46, 66].map((r) => <circle key={r} cx="90" cy="92" r={r} className="fill-none stroke-white/15" />)}
            <path d="M90 36 L132 68 L126 116 L80 146 L46 104 L56 64 Z" className="fill-accent/15 stroke-accent/55" />
            <line x1="90" y1="92" x2="90" y2="36" className="stroke-white/30" />
            <line x1="90" y1="92" x2="132" y2="68" className="stroke-white/30" />
            <line x1="90" y1="92" x2="126" y2="116" className="stroke-white/30" />
            <line x1="90" y1="92" x2="80" y2="146" className="stroke-white/30" />
            <line x1="90" y1="92" x2="46" y2="104" className="stroke-white/30" />
            <line x1="90" y1="92" x2="56" y2="64" className="stroke-white/30" />
          </svg>
        </div>

        <div className="space-y-3 rounded-xl border border-white/10 bg-[#0e1827]/85 p-4">
          {metrics.map((metric) => (
            <div key={metric.label}>
              <div className="flex justify-between text-xs text-[#a9bdd8]">
                <span>{metric.label}</span>
                <span>{metric.value}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${metric.value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
