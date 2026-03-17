import React from 'react'

import { IndividualResultInterpretation } from '@/lib/results-interpretation'
import { ResultsSectionBlock } from '@/components/results/ResultsPrimitives'

export function ResultInterpretationSections({ interpretation }: { interpretation: IndividualResultInterpretation }) {
  return (
    <>
      <ResultsSectionBlock title={interpretation.onboarding.title} description="Use this output as structured performance intelligence.">
        <ul className="space-y-2 text-sm leading-6 text-textSecondary">
          {interpretation.onboarding.points.map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>
      </ResultsSectionBlock>

      {interpretation.layerInterpretations.length > 0 ? (
        <ResultsSectionBlock title="Interpretation by layer" description="Deterministic interpretation from ranked persisted signals.">
          <div className="space-y-4">
            {interpretation.layerInterpretations.map((layer) => (
              <article key={layer.layerKey} className="rounded-2xl border border-border/70 bg-panel/50 p-4">
                <h3 className="text-base font-semibold text-textPrimary">{layer.title}</h3>
                <p className="mt-1 text-sm leading-6 text-textSecondary">{layer.summary}</p>
                <ul className="mt-3 space-y-1 text-sm text-textSecondary">
                  {layer.implications.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <ul className="mt-3 space-y-1 text-sm text-textSecondary">
                  {layer.watchouts.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </ResultsSectionBlock>
      ) : null}

      <ResultsSectionBlock title={interpretation.managerNotes.title} description="Practical use guidance for line managers and reviewers.">
        <ul className="space-y-2 text-sm leading-6 text-textSecondary">
          {interpretation.managerNotes.points.map((point) => (
            <li key={point}>• {point}</li>
          ))}
        </ul>
        <ul className="mt-4 space-y-2 text-xs leading-5 text-textSecondary">
          {interpretation.caveats.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </ResultsSectionBlock>
    </>
  )
}
