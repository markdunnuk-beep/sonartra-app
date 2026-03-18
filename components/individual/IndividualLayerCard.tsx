import React from 'react'

type LayerInsight = {
  primaryLabel: string
  statement: string
  strengths: string[]
  watchouts: string[]
}

type Props = {
  title: string
  insight: LayerInsight
}

export function IndividualLayerCard({ title, insight }: Props) {
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 shadow-sm backdrop-blur-sm">
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/45">
            {title}
          </p>
          <h3 className="text-lg font-semibold text-white">
            {insight.primaryLabel}
          </h3>
          <p className="text-sm leading-6 text-white/75">
            {insight.statement}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
              Strengths
            </h4>
            <ul className="space-y-2">
              {insight.strengths.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-5 text-white/80"
                >
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/50" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="space-y-2">
            <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/50">
              Watchouts
            </h4>
            <ul className="space-y-2">
              {insight.watchouts.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-2 text-sm leading-5 text-white/80"
                >
                  <span className="mt-[6px] h-1.5 w-1.5 shrink-0 rounded-full bg-white/30" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
