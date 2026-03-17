import React from 'react'

import { IndividualResultInterpretation } from '@/lib/results-interpretation'
import { ResultsSectionBlock } from '@/components/results/ResultsPrimitives'

function BulletedList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 text-sm leading-6 text-textSecondary">
      {items.map((point) => (
        <li key={point}>• {point}</li>
      ))}
    </ul>
  )
}

export function ResultInterpretationSections({ interpretation }: { interpretation: IndividualResultInterpretation }) {
  return (
    <>
      <ResultsSectionBlock title={interpretation.onboarding.title} description="Use this output as structured performance intelligence.">
        <BulletedList items={interpretation.onboarding.points} />
      </ResultsSectionBlock>


      <ResultsSectionBlock title={interpretation.performanceProfile.title} description="Deterministic operating summary from the canonical ready-result signal profile.">
        <p className="text-sm leading-6 text-textSecondary">{interpretation.performanceProfile.summary}</p>
        <ul className="mt-3 space-y-1 text-sm text-textSecondary">
          {interpretation.performanceProfile.operatingTraits.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </ResultsSectionBlock>

      <div className="grid gap-5 lg:grid-cols-2">
        <ResultsSectionBlock title={interpretation.bestFit.title} description="Environments and work conditions where this pattern is likely to create stronger output.">
          <BulletedList items={interpretation.bestFit.items} />
        </ResultsSectionBlock>

        <ResultsSectionBlock title={interpretation.leveragePoints.title} description="Practical conditions that can lift execution quality and consistency.">
          <BulletedList items={interpretation.leveragePoints.items} />
        </ResultsSectionBlock>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <ResultsSectionBlock title={interpretation.pressureWatchouts.title} description="Likely trade-offs that may appear under ambiguity, urgency, or sustained pressure.">
          <BulletedList items={interpretation.pressureWatchouts.items} />
        </ResultsSectionBlock>

        <ResultsSectionBlock title={interpretation.teamDynamics.title} description="Lightweight view of likely team contribution and collaboration pattern.">
          <BulletedList items={interpretation.teamDynamics.items} />
        </ResultsSectionBlock>
      </div>

      <ResultsSectionBlock title={interpretation.managerPlaybook.title} description="Compact manager actions for increasing output quality and reducing avoidable friction.">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-textPrimary">What to do</h3>
            <ul className="mt-2 space-y-1 text-sm text-textSecondary">
              {interpretation.managerPlaybook.doItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-textPrimary">What to avoid</h3>
            <ul className="mt-2 space-y-1 text-sm text-textSecondary">
              {interpretation.managerPlaybook.avoidItems.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          </div>
        </div>
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
        <BulletedList items={interpretation.managerNotes.points} />
        <ul className="mt-4 space-y-2 text-xs leading-5 text-textSecondary">
          {interpretation.caveats.map((item) => (
            <li key={item}>• {item}</li>
          ))}
        </ul>
      </ResultsSectionBlock>
    </>
  )
}
