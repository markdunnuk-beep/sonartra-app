'use client'

import React from 'react'

import { useFormState, useFormStatus } from 'react-dom'
import { submitAdminAssessmentArchiveVersionAction, submitAdminAssessmentCreateDraftVersionAction, submitAdminAssessmentPublishVersionAction } from '@/app/admin/assessments/[assessmentId]/actions'
import { Badge, EmptyState, StatusBadge, SurfaceSection, Table } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import {
  getAdminAssessmentVersionSourceLabel,
  type AdminAssessmentVersionMutationState,
  type AdminAssessmentVersionRecord,
} from '@/lib/admin/domain/assessment-management'
import { getAssessmentPackageStatusLabel } from '@/lib/admin/domain/assessment-package'
import { getAdminAssessmentVersionControlTowerSummary } from '@/lib/admin/domain/assessment-package-review'
import { getAdminAssessmentSimulationWorkspaceStatus } from '@/lib/admin/domain/assessment-simulation'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

const INITIAL_STATE: AdminAssessmentVersionMutationState = { status: 'idle' }

function SubmitButton({ label, variant = 'secondary' }: { label: string; variant?: 'primary' | 'secondary' | 'ghost' }) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" variant={variant} disabled={pending} className="min-h-9 px-3 py-2 text-xs">
      {pending ? 'Saving…' : label}
    </Button>
  )
}

function DraftCreator({ assessmentId }: { assessmentId: string }) {
  const [state, action] = useFormState(submitAdminAssessmentCreateDraftVersionAction, INITIAL_STATE)

  return (
    <form action={action} className="space-y-4 rounded-2xl border border-white/[0.08] bg-bg/55 p-4">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.55fr)_minmax(0,1fr)_auto] lg:items-end">
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">New draft version</span>
          <input name="versionLabel" placeholder="1.0.0" className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring" />
          {state.fieldErrors?.versionLabel ? <p className="text-sm text-rose-200">{state.fieldErrors.versionLabel}</p> : null}
        </label>
        <label className="block space-y-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Draft notes</span>
          <input name="notes" placeholder="Optional changelog or operator notes for this draft." className="h-11 w-full rounded-xl border border-border/90 bg-bg/70 px-3.5 text-sm text-textPrimary outline-none ring-accent/40 focus:border-accent/50 focus:ring" />
          {state.fieldErrors?.notes ? <p className="text-sm text-rose-200">{state.fieldErrors.notes}</p> : null}
        </label>
        <div className="flex flex-wrap gap-2 lg:justify-end">
          <SubmitButton label="Create draft version" variant="secondary" />
        </div>
      </div>
      {state.message ? <p className="text-sm text-rose-200">{state.message}</p> : null}
    </form>
  )
}

function PublishVersionForm({ assessmentId, version }: { assessmentId: string; version: AdminAssessmentVersionRecord }) {
  const [state, action] = useFormState(submitAdminAssessmentPublishVersionAction, INITIAL_STATE)

  if (version.lifecycleStatus !== 'draft') {
    return null
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="versionId" value={version.id} />
      <input type="hidden" name="expectedUpdatedAt" value={version.updatedAt} />
      <SubmitButton label="Publish" variant="secondary" />
      {state.message ? <p className="max-w-[12rem] text-xs text-rose-200">{state.message}</p> : null}
    </form>
  )
}

function ArchiveVersionForm({ assessmentId, version }: { assessmentId: string; version: AdminAssessmentVersionRecord }) {
  const [state, action] = useFormState(submitAdminAssessmentArchiveVersionAction, INITIAL_STATE)

  if (version.lifecycleStatus === 'archived') {
    return null
  }

  return (
    <form action={action} className="space-y-2 rounded-2xl border border-white/[0.06] bg-panel/35 p-3">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <input type="hidden" name="versionId" value={version.id} />
      <input type="hidden" name="expectedUpdatedAt" value={version.updatedAt} />
      <label className="flex items-start gap-2 text-xs leading-5 text-textSecondary">
        <input name="confirmation" type="checkbox" value="confirm" className="mt-1 h-4 w-4 rounded border-white/20 bg-bg/80 text-accent focus:ring-accent/60" />
        <span>Confirm archive</span>
      </label>
      <SubmitButton label="Archive" variant="ghost" />
      {state.fieldErrors?.confirmation ? <p className="max-w-[12rem] text-xs text-rose-200">{state.fieldErrors.confirmation}</p> : null}
      {state.message && !state.fieldErrors?.confirmation ? <p className="max-w-[12rem] text-xs text-rose-200">{state.message}</p> : null}
    </form>
  )
}

function getReadinessTone(verdict: 'ready' | 'ready_with_warnings' | 'blocked') {
  switch (verdict) {
    case 'ready':
      return 'emerald' as const
    case 'ready_with_warnings':
      return 'amber' as const
    default:
      return 'rose' as const
  }
}

function getReadinessLabel(verdict: 'ready' | 'ready_with_warnings' | 'blocked') {
  return verdict === 'ready_with_warnings' ? 'Ready with warnings' : verdict === 'ready' ? 'Ready' : 'Blocked'
}

export function AdminAssessmentVersionsManager({
  assessmentId,
  versions,
  currentPublishedVersionId,
}: {
  assessmentId: string
  versions: AdminAssessmentVersionRecord[]
  currentPublishedVersionId?: string | null
}) {
  return (
    <SurfaceSection
      title="Assessment versions"
      eyebrow="Lifecycle control"
      description="Control-tower view of version package state, structured diff evidence, and publish readiness without opening each version."
    >
      <div className="space-y-4">
        <DraftCreator assessmentId={assessmentId} />

        {versions.length ? (
          <Table
            columns={["Version", "Lifecycle", "Package evidence", "Readiness / diff", "Created / updated", "Actions"]}
            rows={versions.map((version) => {
              const controlTower = getAdminAssessmentVersionControlTowerSummary(version, versions, currentPublishedVersionId)
              const simulationStatus = getAdminAssessmentSimulationWorkspaceStatus(version)

              return [
                <div key={`${version.id}-version`} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-textPrimary">v{version.versionLabel}</p>
                    <Badge label={getAdminAssessmentVersionSourceLabel(version.sourceType)} tone="slate" />
                    <Button href={`/admin/assessments/${assessmentId}/versions/${version.versionLabel}`} variant="ghost" className="min-h-8 px-2.5 py-1 text-[10px]">Open</Button>
                  </div>
                  <p className="text-xs text-textSecondary">Created by {version.createdByName ?? 'System'}{version.publishedByName ? ` · Published by ${version.publishedByName}` : ''}</p>
                  <p className="text-xs text-textSecondary">{version.notes ?? 'No notes recorded.'}</p>
                </div>,
                <div key={`${version.id}-status`} className="space-y-2">
                  <StatusBadge status={version.lifecycleStatus} />
                  <p className="text-xs text-textSecondary">{version.publishedAt ? `Published ${formatAdminTimestamp(version.publishedAt)}` : version.archivedAt ? `Archived ${formatAdminTimestamp(version.archivedAt)}` : 'Not yet published'}</p>
                </div>,
                <div key={`${version.id}-payload`} className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge label={getAssessmentPackageStatusLabel(version.packageInfo.status)} tone={version.packageInfo.status === 'valid' ? 'emerald' : version.packageInfo.status === 'valid_with_warnings' ? 'amber' : version.packageInfo.status === 'invalid' ? 'rose' : 'slate'} />
                    <Badge label={getReadinessLabel(controlTower.readiness.verdict)} tone={getReadinessTone(controlTower.readiness.verdict)} />
                  </div>
                  <p className="text-xs text-textSecondary">{version.packageInfo.summary ? `${version.packageInfo.summary.questionsCount} questions · ${version.packageInfo.summary.dimensionsCount} dimensions · imported ${formatAdminTimestamp(version.packageInfo.importedAt)}` : 'No package summary recorded yet.'}</p>
                  <p className="text-xs text-textSecondary">{version.validationStatus ?? 'No validation run recorded yet.'}</p>
                </div>,
                <div key={`${version.id}-evidence`} className="space-y-2">
                  <p className="text-sm leading-6 text-textPrimary">{controlTower.snippet}</p>
                  <p className="text-xs text-textSecondary">{controlTower.diff.baseline ? `Compared with v${controlTower.diff.baseline.versionLabel}` : 'No baseline yet'}</p>
                  <p className="text-xs text-textSecondary">Simulation: {simulationStatus.statusLabel.toLowerCase()}.</p>
                </div>,
                <div key={`${version.id}-updated`} className="space-y-1">
                  <p className="text-sm font-medium text-textPrimary">{formatAdminRelativeTime(version.updatedAt)}</p>
                  <p className="text-xs text-textSecondary">{formatAdminTimestamp(version.updatedAt)}</p>
                  <p className="text-xs text-textSecondary">Created {formatAdminTimestamp(version.createdAt)}</p>
                </div>,
                <div key={`${version.id}-actions`} className="flex flex-col gap-2">
                  <Button href={`/admin/assessments/${assessmentId}/versions/${version.versionLabel}/import`} variant="ghost">{version.packageInfo.status === 'missing' ? 'Import package' : 'Re-import package'}</Button>
                  <Button href={`/admin/assessments/${assessmentId}/versions/${version.versionLabel}/simulate`} variant="ghost">Simulate</Button>
                  <PublishVersionForm assessmentId={assessmentId} version={version} />
                  <ArchiveVersionForm assessmentId={assessmentId} version={version} />
                </div>,
              ]
            })}
          />
        ) : (
          <EmptyState
            title="No versions exist yet"
            detail="Create the first draft version to begin the governed lifecycle for this assessment container."
          />
        )}
      </div>
    </SurfaceSection>
  )
}
