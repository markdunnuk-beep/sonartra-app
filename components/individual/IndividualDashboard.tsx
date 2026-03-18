import React from 'react'

import { IndividualLayerCard } from "@/components/individual/IndividualLayerCard"
import type { IndividualDashboardProfile } from "@/lib/interpretation/buildIndividualDashboardProfile"

type Props = {
  profile: IndividualDashboardProfile
  showOverview?: boolean
}

export function IndividualDashboard({ profile, showOverview = true }: Props) {
  const { header, layers } = profile

  const cards = [
    { title: "Behaviour Style", insight: layers.behaviour },
    { title: "Motivators", insight: layers.motivators },
    { title: "Leadership", insight: layers.leadership },
    { title: "Conflict", insight: layers.conflict },
    { title: "Culture", insight: layers.culture },
    { title: "Stress", insight: layers.stress },
  ] as const

  return (
    <div className="space-y-8">
      {showOverview ? (
        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-sm backdrop-blur-sm md:p-8">
          <div className="max-w-3xl space-y-3">
            <p className="text-sm font-medium text-white/55">
              Individual Overview
            </p>

            <h1 className="text-2xl font-semibold tracking-tight text-white md:text-3xl">
              {header.title}
            </h1>

            <p className="text-base font-medium text-white/80">
              {header.profileLabel}
            </p>

            <p className="max-w-2xl text-sm leading-6 text-white/70 md:text-base">
              {header.summary}
            </p>
          </div>
        </section>
      ) : null}

      <section className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {cards.map((card) => (
          <IndividualLayerCard
            key={card.title}
            title={card.title}
            insight={card.insight}
          />
        ))}
      </section>
    </div>
  )
}
