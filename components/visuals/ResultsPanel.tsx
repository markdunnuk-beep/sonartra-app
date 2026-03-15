const leadershipMetrics = [
  ['Strategic Vision', 82],
  ['Execution Discipline', 66],
  ['Risk Appetite', 73],
  ['Conflict Style', 44],
]

export function ResultsPanel() {
  return (
    <div className="visual-shell interactive-surface rounded-2xl border border-border/80 bg-[#0c1624]/85 p-5">
      <p className="eyebrow">Generated Insight Preview</p>
      <div className="mt-4 rounded-xl border border-white/10 bg-[#0f1b2b]/80 p-4">
        <p className="text-sm font-medium text-[#e2ecfb]">Leadership Architecture</p>
        <div className="mt-3 space-y-2">
          {leadershipMetrics.map(([label, value]) => (
            <div key={label}>
              <div className="flex justify-between text-xs text-[#9eb3ce]">
                <span>{label}</span>
                <span>{value}%</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-white/10">
                <div className="h-full rounded-full bg-accent/70" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {[
          ['Culture Tension Index', 'Moderate'],
          ['Stress Derailer Risk', 'Monitored'],
          ['Behavioural Strength Profile', 'Adaptive Strategist'],
          ['Decision Reliability', 'High Confidence'],
        ].map(([title, value]) => (
          <div key={title} className="rounded-lg border border-white/10 bg-[#111f31]/80 px-3 py-2">
            <p className="text-[11px] uppercase tracking-[0.13em] text-[#90a7c5]">{title}</p>
            <p className="mt-1 text-sm text-[#d4e2f5]">{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
