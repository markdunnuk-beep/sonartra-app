'use client'

import React from 'react'
import { ShieldCheck, TriangleAlert } from 'lucide-react'
import { Badge, MetaGrid, SurfaceSection, Table } from '@/components/admin/surfaces/AdminWireframePrimitives'
import type { AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import { generateAdminAssessmentReportOutput, type AdminAssessmentGeneratedReportOutput } from '@/lib/admin/domain/assessment-report-output'
import type { AdminAssessmentSimulationResult } from '@/lib/admin/domain/assessment-simulation'

function getQualityTone(verdict: AdminAssessmentGeneratedReportOutput['quality']['verdict']) {
  switch (verdict) {
    case 'strong':
      return 'emerald' as const
    case 'usable_with_gaps':
      return 'amber' as const
    default:
      return 'rose' as const
  }
}

function getWarningTone(severity: 'warning' | 'error') {
  return severity === 'error' ? 'rose' as const : 'amber' as const
}

export function AdminAssessmentReportOutputPreviewPanel({
  version,
  simulationResult,
}: {
  version: AdminAssessmentVersionRecord
  simulationResult: AdminAssessmentSimulationResult
}) {
  const materialized = simulationResult.contractVersion === 'package_contract_v2'
    ? simulationResult.materializedOutputs ?? null
    : null
  const output = React.useMemo<AdminAssessmentGeneratedReportOutput | null>(() => {
    if (simulationResult.contractVersion === 'package_contract_v2' || !version.normalizedPackage) {
      return null
    }

    return generateAdminAssessmentReportOutput(version.normalizedPackage, simulationResult)
  }, [simulationResult, version.normalizedPackage])

  if (simulationResult.contractVersion === 'package_contract_v2') {
    if (!materialized) {
      return null
    }

    return (
      <div className="space-y-5">
        <SurfaceSection
          title="Materialized output preview"
          eyebrow="Package Contract v2"
          description="Admin-only materialization turns raw v2 evaluation facts into stable web-summary and report-document contracts without implying live runtime or PDF renderer readiness."
        >
          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-textSecondary" />
                <p className="text-sm font-medium text-textPrimary">Materialization summary</p>
                <Badge label={simulationResult.readinessStatus ?? 'n/a'} tone={simulationResult.evaluationStatus === 'failed' ? 'rose' : simulationResult.warnings.length ? 'amber' : 'emerald'} />
              </div>
              <p className="mt-3 text-sm leading-6 text-textSecondary">{simulationResult.evaluationStatus === 'failed' ? 'Simulation surfaced blocking issues.' : 'Simulation and materialization completed safely for admin preview.'}</p>
              <div className="mt-4">
                <MetaGrid
                  columns={2}
                  items={[
                    { label: 'Web summary outputs', value: String(materialized.webSummaryOutputs.length) },
                    { label: 'Report sections', value: String(materialized.reportDocument.sections.length) },
                    { label: 'Integrity notices', value: String(materialized.integrityNotices.length) },
                    { label: 'Diagnostics', value: String(materialized.diagnostics.length) },
                    { label: 'Triggered outputs', value: String(materialized.adminDebug.triggeredOutputKeys.length) },
                    { label: 'Non-triggered outputs', value: String(materialized.adminDebug.nonTriggeredOutputKeys.length) },
                  ]}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <p className="text-sm font-medium text-textPrimary">Web summary outputs</p>
              <div className="mt-3 space-y-3">
                {materialized.webSummaryOutputs.map((entry) => (
                  <article key={entry.id} className="rounded-2xl border border-white/[0.07] bg-panel/40 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge label={entry.status} tone={entry.status === 'available' ? 'emerald' : entry.status === 'warning' ? 'amber' : 'slate'} />
                      {entry.severity ? <Badge label={entry.severity} tone={entry.severity === 'error' ? 'rose' : entry.severity === 'warning' ? 'amber' : 'sky'} /> : null}
                      {entry.band ? <Badge label={`Band ${entry.band}`} tone="sky" /> : null}
                    </div>
                    <h4 className="mt-3 text-base font-semibold text-textPrimary">{entry.title}</h4>
                    <p className="mt-2 text-sm text-textSecondary">{entry.explanation.text ?? 'No narrative explanation attached.'}</p>
                    <p className="mt-2 text-xs text-textSecondary">Score {entry.value.score ?? 'n/a'} · raw {entry.value.rawScore ?? 'n/a'} · descriptor {entry.value.descriptor ?? 'n/a'}</p>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </SurfaceSection>

        <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
          <SurfaceSection
            title="Report document structure"
            eyebrow="Renderer-agnostic contract"
            description="These sections and blocks are declarative report content contracts for later PDF/report rendering layers."
          >
            <div className="space-y-3">
              {materialized.reportDocument.sections.map((section) => (
                <article key={section.id} className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                  <div className="flex items-center gap-2">
                    <Badge label={section.kind.replace(/_/g, ' ')} tone="slate" />
                    <h4 className="text-base font-semibold text-textPrimary">{section.title}</h4>
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-textPrimary">
                    {section.blocks.map((block) => <li key={block.id}>• {block.title}{block.text ? ` · ${block.text}` : ''}</li>)}
                  </ul>
                </article>
              ))}
            </div>
          </SurfaceSection>

          <SurfaceSection
            title="Integrity notices + diagnostics"
            eyebrow="Admin debug"
            description="Missing bindings, limitations, and triggered integrity signals remain explicit in admin preview so downstream renderers do not fail late."
          >
            <div className="space-y-3">
              {materialized.integrityNotices.map((warning) => (
                <div key={warning.id} className="rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <TriangleAlert className="h-4 w-4 text-textSecondary" />
                    <Badge label={warning.severity} tone={getWarningTone(warning.severity === 'info' ? 'warning' : warning.severity)} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-textPrimary">{warning.message}</p>
                </div>
              ))}
              {materialized.diagnostics.map((diagnostic) => (
                <div key={`${diagnostic.code}-${diagnostic.path}`} className={`rounded-2xl border px-4 py-3 ${diagnostic.severity === 'error' ? 'border-rose-400/20 bg-rose-400/[0.06]' : 'border-amber-400/20 bg-amber-400/[0.06]'}`}>
                  <Badge label={diagnostic.severity} tone={diagnostic.severity === 'error' ? 'rose' : 'amber'} />
                  <p className="mt-3 text-sm leading-6 text-textPrimary">{diagnostic.message}</p>
                  <p className="mt-2 text-xs text-textSecondary">{diagnostic.path}</p>
                </div>
              ))}
            </div>
          </SurfaceSection>
        </div>

        <SurfaceSection
          title="Debug output model"
          eyebrow="Secondary disclosure"
          description="Raw structured materialization output is available for QA and downstream contract inspection."
        >
          <details className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
            <summary className="cursor-pointer text-sm font-medium text-textPrimary">Show generated output JSON</summary>
            <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.06] bg-panel/40 p-4 text-xs leading-6 text-textSecondary">{JSON.stringify(materialized, null, 2)}</pre>
          </details>
        </SurfaceSection>
      </div>
    )
  }

  if (!version.normalizedPackage || !output) {
    return null
  }

  return (
    <div className="space-y-5">
      <SurfaceSection
        title="Report-output quality"
        eyebrow="QA verdict"
        description="This verdict is about generated content quality and trace coverage, not the final end-user runtime or PDF rendering layer."
      >
        <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-textSecondary" />
              <p className="text-sm font-medium text-textPrimary">Quality verdict</p>
              <Badge label={output.quality.verdict.replace(/_/g, ' ')} tone={getQualityTone(output.quality.verdict)} />
            </div>
            <p className="mt-3 text-sm leading-6 text-textSecondary">{output.quality.summary}</p>
            <div className="mt-4">
              <MetaGrid
                columns={2}
                items={[
                  { label: 'Locale', value: output.locale },
                  { label: 'PDF blocks', value: String(output.pdfBlocks.length) },
                  { label: 'Trace sections', value: String(output.traceability.length) },
                  { label: 'Warnings', value: String(output.warnings.length) },
                  { label: 'Authored sections', value: String(output.quality.authoredSectionCount) },
                  { label: 'Fallback sections', value: String(output.quality.fallbackSectionCount) },
                ]}
              />
            </div>
          </div>

          <Table
            columns={['Check', 'Status', 'Detail']}
            rows={output.quality.checks.map((check) => [
              <p key={`${check.key}-label`} className="text-sm font-medium text-textPrimary">{check.label}</p>,
              <Badge key={`${check.key}-status`} label={check.status} tone={check.status === 'pass' ? 'emerald' : check.status === 'warning' ? 'amber' : 'rose'} />,
              <p key={`${check.key}-detail`} className="text-sm text-textPrimary">{check.detail}</p>,
            ])}
          />
        </div>
      </SurfaceSection>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <SurfaceSection
          title="Summary output preview"
          eyebrow="Web summary model"
          description="Structured summary blocks future web delivery layers can consume without re-deriving rule or score evidence in the page component."
        >
          <div className="space-y-4">
            <div className="rounded-[1.5rem] border border-white/[0.08] bg-panel/55 p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Headline</p>
                  <h3 className="mt-3 text-2xl font-semibold text-textPrimary">{output.webSummary.headline.text ?? 'No headline generated'}</h3>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge label={output.webSummary.headline.source.replace(/_/g, ' ')} tone={output.webSummary.headline.source === 'package_authored_localized' ? 'emerald' : output.webSummary.headline.source === 'package_authored_default_locale' ? 'amber' : 'slate'} />
                    {output.webSummary.headline.localeUsed ? <Badge label={`Locale ${output.webSummary.headline.localeUsed}`} tone="sky" /> : null}
                    {output.webSummary.headline.fallbackPath.length ? <Badge label="Fallback path used" tone="amber" /> : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-textSecondary">{output.webSummary.overview}</p>
                </div>
                <Badge label={output.webSummary.verdict.label} tone={getQualityTone(output.quality.verdict)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {output.webSummary.badges.map((badge) => <Badge key={badge.id} label={badge.label} tone={badge.tone} />)}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {output.webSummary.dimensionCards.map((card) => (
                <article key={card.id} className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">Dimension</p>
                      <h4 className="mt-2 text-lg font-semibold text-textPrimary">{card.label}</h4>
                    </div>
                    <p className="text-lg font-semibold text-textPrimary">{card.score ?? 'n/a'}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {card.badges.map((badge) => <Badge key={badge.id} label={badge.label} tone={badge.tone} />)}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-textSecondary">{card.narrative}</p>
                  <p className="mt-3 text-xs text-textSecondary">Authored narrative source: {card.provenance.replace(/_/g, ' ')}{card.localeUsed ? ` · locale ${card.localeUsed}` : ''}</p>
                  {card.fallbackPath.length ? <p className="mt-2 text-xs text-amber-100">Fallback path: {card.fallbackPath.join(' · ')}</p> : null}
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-textSecondary">Trace section: {card.traceSectionId}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              {output.webSummary.sections.map((section) => (
                <article key={section.id} className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{section.kind.replace(/_/g, ' ')}</p>
                  <h4 className="mt-2 text-base font-semibold text-textPrimary">{section.title}</h4>
                  {section.narrative ? <p className="mt-3 text-sm leading-6 text-textSecondary">{section.narrative}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge label={section.provenance.replace(/_/g, ' ')} tone={section.provenance === 'package_authored_localized' ? 'emerald' : section.provenance === 'package_authored_default_locale' ? 'amber' : 'slate'} />
                    {section.localeUsed ? <Badge label={`Locale ${section.localeUsed}`} tone="sky" /> : null}
                    {section.fallbackPath.length ? <Badge label="system fallback" tone="amber" /> : null}
                  </div>
                  <ul className="mt-3 space-y-2 text-sm leading-6 text-textPrimary">
                    {section.items.map((item) => <li key={item}>• {item}</li>)}
                  </ul>
                  <p className="mt-3 text-xs uppercase tracking-[0.14em] text-textSecondary">Trace section: {section.traceSectionId}</p>
                </article>
              ))}
            </div>
          </div>
        </SurfaceSection>

        <SurfaceSection
          title="Warnings and fallbacks"
          eyebrow="Output QA signals"
          description="Missing language, locale fallback, authored narrative provenance, and system-generated fallback copy are surfaced explicitly instead of being silently hidden."
        >
          <div className="space-y-3">
            {output.warnings.length ? output.warnings.map((warning) => (
              <div key={`${warning.code}-${warning.message}`} className={`rounded-2xl border px-4 py-3 ${warning.severity === 'error' ? 'border-rose-400/20 bg-rose-400/[0.06]' : 'border-amber-400/20 bg-amber-400/[0.06]'}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <TriangleAlert className="h-4 w-4 text-textSecondary" />
                  <Badge label={warning.severity} tone={getWarningTone(warning.severity)} />
                  {warning.sectionId ? <Badge label={warning.sectionId} tone="slate" /> : null}
                </div>
                <p className="mt-3 text-sm leading-6 text-textPrimary">{warning.message}</p>
                {warning.relatedKeys.length ? <p className="mt-2 text-xs text-textSecondary">Related: {warning.relatedKeys.join(', ')}</p> : null}
              </div>
            )) : <p className="text-sm leading-6 text-textSecondary">No warnings or fallback markers were required for this sample preview.</p>}
          </div>
        </SurfaceSection>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <SurfaceSection
          title="PDF content block preview"
          eyebrow="Renderer-ready model"
          description="These deterministic blocks are ordered, typed, and trace-linked for a later PDF rendering engine without binding this admin UI to the renderer implementation."
        >
          <div className="space-y-3">
            {output.pdfBlocks.map((block) => (
              <article key={block.id} className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{block.type.replace(/_/g, ' ')} · #{block.order}</p>
                    <h4 className="mt-2 text-base font-semibold text-textPrimary">{block.title}</h4>
                  </div>
                  <Badge label={block.sectionIdentifier} tone="slate" />
                </div>
                {block.text ? <p className="mt-3 text-sm leading-6 text-textSecondary">{block.text}</p> : null}
                {block.items?.length ? <ul className="mt-3 space-y-2 text-sm leading-6 text-textPrimary">{block.items.map((item) => <li key={item}>• {item}</li>)}</ul> : null}
                {block.table ? (
                  <div className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.06] bg-panel/35 p-3">
                    <table className="min-w-full text-left text-sm text-textPrimary">
                      <thead>
                        <tr>
                          {block.table.columns.map((column) => <th key={column} className="px-2 py-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-textSecondary">{column}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {block.table.rows.map((row, rowIndex) => (
                          <tr key={`${block.id}-${rowIndex}`} className="border-t border-white/[0.06]">
                            {row.map((cell, cellIndex) => <td key={`${block.id}-${rowIndex}-${cellIndex}`} className="px-2 py-2 align-top">{cell}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge label={block.sectionId} tone="sky" />
                  <Badge label={block.metadata.provenance.replace(/_/g, ' ')} tone={block.metadata.provenance === 'package_authored_localized' ? 'emerald' : block.metadata.provenance === 'package_authored_default_locale' ? 'amber' : 'slate'} />
                  {block.metadata.fallbackUsed ? <Badge label="fallback used" tone="amber" /> : null}
                  <Badge label={`${block.metadata.dimensionIds.length} dimension refs`} tone="slate" />
                </div>
              </article>
            ))}
          </div>
        </SurfaceSection>

        <SurfaceSection
          title="Traceability and evidence"
          eyebrow="Rule + language lineage"
          description="Every generated section exposes the rule keys, language keys, dimension evidence, and fallback behavior that produced it."
        >
          <div className="space-y-3">
            {output.traceability.map((trace) => (
              <article key={trace.sectionId} className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-textSecondary">{trace.sectionType.replace(/_/g, ' ')}</p>
                    <h4 className="mt-2 text-base font-semibold text-textPrimary">{trace.title}</h4>
                  </div>
                  <Badge label={trace.sectionId} tone="slate" />
                </div>
                <div className="mt-4 grid gap-3 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Rule / language refs</p>
                    <p className="mt-2 text-xs text-textSecondary">Provenance: {trace.provenance.replace(/_/g, ' ')}{trace.locale ? ` · locale ${trace.locale}` : ''}</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-textPrimary">
                      {(trace.ruleKeys.length ? trace.ruleKeys.map((value) => `Rule · ${value}`) : ['No direct rule key']).concat(trace.languageKeys.length ? trace.languageKeys.map((value) => `Language · ${value}`) : []).map((value) => <li key={value}>• {value}</li>)}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Score evidence</p>
                    <ul className="mt-2 space-y-2 text-sm leading-6 text-textPrimary">
                      {trace.scoreEvidence.length ? trace.scoreEvidence.map((evidence) => (
                        <li key={`${trace.sectionId}-${evidence.dimensionId}`}>• {evidence.dimensionId} · raw {evidence.rawScore ?? 'n/a'} · normalized {evidence.normalizedScore ?? 'n/a'} · band {evidence.bandKey ?? 'n/a'}</li>
                      )) : <li>• No score evidence attached</li>}
                    </ul>
                  </div>
                </div>
                {(trace.fallbacks.length || trace.warnings.length) ? (
                  <div className="mt-4 border-t border-white/[0.06] pt-4">
                    {trace.fallbacks.length ? <p className="text-sm text-amber-100">Fallbacks: {trace.fallbacks.join(' · ')}</p> : null}
                    {trace.warnings.length ? <p className="mt-2 text-sm text-amber-100">Warnings: {trace.warnings.join(' · ')}</p> : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </SurfaceSection>
      </div>

      <SurfaceSection
        title="Debug output model"
        eyebrow="Secondary disclosure"
        description="Raw structured output is available for QA and downstream contract inspection without turning the main preview into a JSON-only experience."
      >
        <details className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
          <summary className="cursor-pointer text-sm font-medium text-textPrimary">Show generated output JSON</summary>
          <pre className="mt-4 overflow-x-auto rounded-2xl border border-white/[0.06] bg-panel/40 p-4 text-xs leading-6 text-textSecondary">{JSON.stringify(output, null, 2)}</pre>
        </details>
      </SurfaceSection>
    </div>
  )
}
