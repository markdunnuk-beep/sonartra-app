import React from 'react'
import dynamic from 'next/dynamic'
import { Activity, ArrowLeft, FileJson2, FlaskConical, GitCompareArrows, ShieldCheck } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { AdminAssessmentVersionPackageImportForm } from '@/components/admin/surfaces/AdminAssessmentVersionPackageImportForm'
import { Badge, EmptyState, MetaGrid, SurfaceSection, Table } from '@/components/admin/surfaces/AdminWireframePrimitives'
import { Button } from '@/components/ui/Button'
import type { AdminAssessmentDetailData, AdminAssessmentVersionRecord } from '@/lib/admin/domain/assessment-management'
import { buildAdminAuditHref, getAdminAuditEventLabel, getAdminAuditEventTone } from '@/lib/admin/domain/audit'
import { getAssessmentPackageStatusLabel } from '@/lib/admin/domain/assessment-package'
import {
  getAdminAssessmentPackagePreviewSummary,
  getAdminAssessmentVersionDiff,
  getAdminAssessmentVersionReadiness,
} from '@/lib/admin/domain/assessment-package-review'
import { getAdminAssessmentSimulationWorkspaceStatus } from '@/lib/admin/domain/assessment-simulation'
import { getAdminAssessmentReportPreviewWorkspaceStatus } from '@/lib/admin/domain/assessment-report-output'
import { formatAdminRelativeTime, formatAdminTimestamp } from '@/lib/admin/wireframe'

function getPackageTone(status: AdminAssessmentVersionRecord['packageInfo']['status']) {
  switch (status) {
    case 'valid':
      return 'emerald' as const
    case 'valid_with_warnings':
      return 'amber' as const
    case 'invalid':
      return 'rose' as const
    default:
      return 'slate' as const
  }
}

function getReadinessTone(status: 'ready' | 'ready_with_warnings' | 'not_ready') {
  switch (status) {
    case 'ready':
      return 'emerald' as const
    case 'ready_with_warnings':
      return 'amber' as const
    default:
      return 'rose' as const
  }
}

function getMutationMessage(mutation?: string) {
  if (mutation === 'package-imported') {
    return 'Assessment package imported successfully.'
  }

  return null
}

function normalizeVersionForDisplay(version: AdminAssessmentVersionRecord): AdminAssessmentVersionRecord {
  const packageInfo = version.packageInfo ?? {
    status: 'missing' as const,
    schemaVersion: null,
    sourceType: null,
    importedAt: null,
    importedByName: null,
    sourceFilename: null,
    summary: null,
    errors: [],
    warnings: [],
  }

  return {
    ...version,
    packageInfo: {
      status: packageInfo.status,
      schemaVersion: packageInfo.schemaVersion ?? null,
      sourceType: packageInfo.sourceType ?? null,
      importedAt: packageInfo.importedAt ?? null,
      importedByName: packageInfo.importedByName ?? null,
      sourceFilename: packageInfo.sourceFilename ?? null,
      summary: packageInfo.summary ?? null,
      errors: Array.isArray(packageInfo.errors) ? packageInfo.errors : [],
      warnings: Array.isArray(packageInfo.warnings) ? packageInfo.warnings : [],
    },
    savedScenarios: Array.isArray(version.savedScenarios) ? version.savedScenarios : [],
    latestSuiteSnapshot: version.latestSuiteSnapshot ?? null,
    releaseGovernance: version.releaseGovernance
      ? {
          readinessStatus: version.releaseGovernance.readinessStatus,
          readinessSummary: version.releaseGovernance.readinessSummary ?? null,
          lastReadinessEvaluatedAt: version.releaseGovernance.lastReadinessEvaluatedAt ?? null,
          signOff: version.releaseGovernance.signOff ?? { status: 'unsigned', signedOffBy: null, signedOffAt: null, isStale: false, staleReason: null },
          releaseNotes: version.releaseGovernance.releaseNotes ?? null,
        }
      : undefined,
  }
}

function formatReadinessLabel(status: 'ready' | 'ready_with_warnings' | 'not_ready') {
  return status === 'ready_with_warnings' ? 'Ready with warnings' : status === 'ready' ? 'Ready' : 'Not ready'
}

function getSuiteSnapshotTone(status: NonNullable<AdminAssessmentVersionRecord['latestSuiteSnapshot']>['overallStatus']) {
  return status === 'pass' ? 'emerald' as const : status === 'warning' ? 'amber' as const : 'rose' as const
}

const AdminAssessmentVersionReleaseControls = dynamic(() => import('@/components/admin/surfaces/AdminAssessmentVersionReleaseControls').then((module) => module.AdminAssessmentVersionReleaseControls), { ssr: false })

function EvidenceList({ items, tone }: { items: string[]; tone: 'rose' | 'amber' }) {
  if (!items.length) {
    return null
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item} className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${tone === 'rose' ? 'border-rose-400/15 bg-rose-400/[0.05] text-rose-100' : 'border-amber-400/15 bg-amber-400/[0.05] text-amber-100'}`}>
          {item}
        </li>
      ))}
    </ul>
  )
}

export function AdminAssessmentVersionDetailSurface({
  detailData,
  version,
  mode = 'detail',
  mutation,
}: {
  detailData: AdminAssessmentDetailData
  version: AdminAssessmentVersionRecord
  mode?: 'detail' | 'import'
  mutation?: string
}) {
  const safeVersion = normalizeVersionForDisplay(version)
  const flashMessage = getMutationMessage(mutation)
  const activity = (Array.isArray(detailData.activity) ? detailData.activity : []).filter((event) => event.entityId === safeVersion.id || event.entityId === detailData.assessment.id).slice(0, 8)
  const packageInfo = safeVersion.packageInfo
  const packageSummary = packageInfo.summary
  const preview = getAdminAssessmentPackagePreviewSummary(safeVersion)
  const readiness = getAdminAssessmentVersionReadiness(safeVersion)
  const releaseGovernance = safeVersion.releaseGovernance ?? {
    readinessStatus: readiness.status,
    readinessSummary: null,
    lastReadinessEvaluatedAt: null,
    signOff: { status: 'unsigned' as const, signedOffBy: null, signedOffAt: null, isStale: false, staleReason: null },
    releaseNotes: null,
  }
  const storedReadiness = releaseGovernance.readinessSummary
  const publishGateMessage = readiness.status === 'not_ready'
    ? `Publish is blocked until ${readiness.blockingIssues[0] ?? 'the failing readiness checks are resolved'}.`
    : readiness.status === 'ready_with_warnings' && releaseGovernance.signOff.status !== 'signed_off'
      ? 'Publish is warning-gated: record release sign-off before publishing while warnings remain.'
      : readiness.status === 'ready_with_warnings'
        ? 'Publish is allowed because a release sign-off is recorded for the current warning set.'
        : 'Publish is currently allowed.'
  const diff = getAdminAssessmentVersionDiff(safeVersion, detailData.versions.map(normalizeVersionForDisplay), detailData.assessment.currentPublishedVersionId)
  const simulationStatus = getAdminAssessmentSimulationWorkspaceStatus(safeVersion)
  const reportPreviewStatus = getAdminAssessmentReportPreviewWorkspaceStatus(safeVersion)
  const latestSuiteSnapshot = safeVersion.latestSuiteSnapshot

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        eyebrow="Assessment version"
        title={`${detailData.assessment.name} · v${safeVersion.versionLabel}`}
        description={mode === 'import'
          ? 'Transitional draft-version import workspace. The preferred path now starts from package import, which creates or matches the assessment automatically before landing in version governance.'
          : 'Operational review workspace for package preview, comparison evidence, and publish-readiness before release.'}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Button href={`/admin/assessments/${detailData.assessment.id}?tab=versions`} variant="ghost"><ArrowLeft className="mr-2 h-4 w-4" />Back to versions</Button>
            {mode === 'detail' ? <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/import`} variant="secondary"><FileJson2 className="mr-2 h-4 w-4" />Import package</Button> : null}
            {mode === 'detail' ? <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/simulate`} variant="ghost"><FlaskConical className="mr-2 h-4 w-4" />Simulate</Button> : null}
            {mode === 'detail' ? <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/report-preview`} variant="ghost">Report preview</Button> : null}
            {mode === 'detail' ? <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/scenarios`} variant="ghost">Scenario library</Button> : null}
            <Button href={buildAdminAuditHref({ entityType: 'assessment_version', entityId: safeVersion.id })} variant="ghost"><Activity className="mr-2 h-4 w-4" />View audit</Button>
          </div>
        )}
      />

      {flashMessage ? <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/[0.08] px-4 py-3 text-sm text-emerald-100">{flashMessage}</div> : null}

      <div className="grid gap-4 xl:grid-cols-4">
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Publish readiness</p>
          <div className="mt-3 flex items-center gap-2"><Badge label={formatReadinessLabel(readiness.status)} tone={getReadinessTone(readiness.status)} /><ShieldCheck className="h-4 w-4 text-textSecondary" /></div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{readiness.summary}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Package state</p>
          <div className="mt-3"><Badge label={getAssessmentPackageStatusLabel(packageInfo.status)} tone={getPackageTone(packageInfo.status)} /></div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{preview.provenanceSummary}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Comparison baseline</p>
          <div className="mt-3 flex items-center gap-2 text-lg font-semibold text-textPrimary"><GitCompareArrows className="h-4 w-4 text-textSecondary" />{diff.baseline ? `v${diff.baseline.versionLabel}` : 'First version'}</div>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{diff.baseline?.summary ?? 'This is the first imported version, so there is no comparison baseline yet. Future versions will compare against the strongest available baseline automatically.'}</p>
        </div>
        <div className="rounded-[1.25rem] border border-white/[0.08] bg-panel/60 p-4">
          <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Package stats</p>
          <p className="mt-3 text-lg font-semibold text-textPrimary">{packageSummary ? `${preview.metrics.questionsCount} questions` : 'No package'}</p>
          <p className="mt-3 text-sm leading-6 text-textSecondary">{packageSummary ? `${preview.metrics.dimensionsCount} dimensions · ${preview.metrics.optionsCount} options · ${preview.metrics.outputRuleCount} output rules.` : 'Summary metrics populate after a valid import.'}</p>
        </div>
      </div>

      <SurfaceSection
        title="Release control"
        eyebrow="Governance"
        description="Compact release governance for publish readiness, explicit sign-off, release notes, and truthful publish gating."
      >
        <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={formatReadinessLabel(readiness.status)} tone={getReadinessTone(readiness.status)} />
              <Badge label={releaseGovernance.signOff.status === 'signed_off' ? 'Signed off' : 'Unsigned'} tone={releaseGovernance.signOff.status === 'signed_off' ? 'emerald' : 'slate'} />
              {latestSuiteSnapshot ? <Badge label={`Suite ${latestSuiteSnapshot.overallStatus}`} tone={getSuiteSnapshotTone(latestSuiteSnapshot.overallStatus)} /> : <Badge label="No suite snapshot" tone="slate" />}
            </div>

            <MetaGrid
              columns={2}
              items={[
                { label: 'Last readiness evaluation', value: formatAdminTimestamp(releaseGovernance.lastReadinessEvaluatedAt) },
                { label: 'Stored readiness status', value: formatReadinessLabel(releaseGovernance.readinessStatus) },
                { label: 'Sign-off', value: releaseGovernance.signOff.status === 'signed_off' ? 'Signed off' : 'Unsigned' },
                { label: 'Signed off by', value: releaseGovernance.signOff.signedOffBy ?? '—' },
                { label: 'Signed off at', value: formatAdminTimestamp(releaseGovernance.signOff.signedOffAt) },
                { label: 'Material package updated', value: formatAdminTimestamp(safeVersion.materialUpdatedAt ?? safeVersion.updatedAt) },
              ]}
            />

            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Publish gating</p>
              <p className="mt-3 text-sm leading-6 text-textPrimary">{publishGateMessage}</p>
              {releaseGovernance.signOff.isStale ? <p className="mt-2 text-xs text-amber-200">{releaseGovernance.signOff.staleReason}</p> : null}
              {storedReadiness ? <p className="mt-2 text-xs text-textSecondary">Last stored summary: {storedReadiness.summaryText}</p> : null}
            </div>

            <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <p className="text-[11px] uppercase tracking-[0.16em] text-textSecondary">Release notes preview</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-textPrimary">{releaseGovernance.releaseNotes ?? 'No internal release notes recorded yet.'}</p>
            </div>
          </div>

          <AdminAssessmentVersionReleaseControls assessmentId={detailData.assessment.id} version={safeVersion} />
        </div>
      </SurfaceSection>

      <SurfaceSection
        title="Latest regression suite snapshot"
        eyebrow="Release-control visibility"
        description="A compact version-level summary of the most recent full saved-scenario suite run. This is not historical run storage; it is the latest truthful release signal only."
        actions={<Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/simulate`} variant="secondary">Open scenario library / suite</Button>}
      >
        {latestSuiteSnapshot ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={latestSuiteSnapshot.overallStatus} tone={getSuiteSnapshotTone(latestSuiteSnapshot.overallStatus)} />
              <p className="text-sm text-textSecondary">{latestSuiteSnapshot.summaryText}</p>
            </div>
            <MetaGrid
              columns={3}
              items={[
                { label: 'Last run', value: formatAdminTimestamp(latestSuiteSnapshot.executedAt) },
                { label: 'Executed by', value: latestSuiteSnapshot.executedBy ?? 'Unknown' },
                { label: 'Baseline used', value: latestSuiteSnapshot.baselineVersionLabel ? `v${latestSuiteSnapshot.baselineVersionLabel}` : 'None selected' },
                { label: 'Scenarios run', value: String(latestSuiteSnapshot.totalScenarios) },
                { label: 'Pass / warning / fail', value: `${latestSuiteSnapshot.passedCount} / ${latestSuiteSnapshot.warningCount} / ${latestSuiteSnapshot.failedCount}` },
                { label: 'Overall status', value: latestSuiteSnapshot.overallStatus },
              ]}
            />
          </div>
        ) : (
          <EmptyState title="No suite snapshot stored" detail="Run the full saved-scenario suite from the simulation workspace to persist a compact release-control summary on this version." />
        )}
      </SurfaceSection>

      <SurfaceSection
        title="Overview"
        eyebrow="Version control"
        description="Governance-focused summary of package provenance, validation posture, and what this version is carrying right now."
        actions={mode === 'detail' ? <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/import`} variant="secondary">Re-import package</Button> : null}
      >
        <MetaGrid
          columns={4}
          items={[
            { label: 'Lifecycle', value: safeVersion.lifecycleStatus },
            { label: 'Readiness verdict', value: formatReadinessLabel(readiness.status) },
            { label: 'Package state', value: getAssessmentPackageStatusLabel(packageInfo.status) },
            { label: 'Schema version', value: preview.schemaVersion ?? 'None' },
            { label: 'Source type', value: packageInfo.sourceType ?? 'None' },
            { label: 'Imported by', value: packageInfo.importedByName ?? 'Unknown' },
            { label: 'Imported at', value: formatAdminTimestamp(packageInfo.importedAt) },
            { label: 'Source filename', value: packageInfo.sourceFilename ?? 'Not supplied' },
            { label: 'Questions', value: String(preview.metrics.questionsCount) },
            { label: 'Dimensions', value: String(preview.metrics.dimensionsCount) },
            { label: 'Normalization coverage', value: `${preview.metrics.normalizationCoveredDimensions}/${preview.metrics.totalDimensions}` },
            { label: 'Language coverage', value: `${preview.metrics.languageKeyCount} keys · ${preview.metrics.localeCount} locale(s)` },
          ]}
        />
      </SurfaceSection>

      {mode === 'import' ? (
        <SurfaceSection
          title="Import assessment package"
          eyebrow="Draft-only transitional workflow"
          description="Use this when a draft version already exists. In the primary workflow, start from the registry package import surface so library-key matching can create or attach automatically."
        >
          {safeVersion.lifecycleStatus === 'draft'
            ? <AdminAssessmentVersionPackageImportForm assessmentId={detailData.assessment.id} version={safeVersion} />
            : <EmptyState title="Import unavailable" detail="Published and archived versions are immutable. Create or reopen a draft version before importing a package." />}
        </SurfaceSection>
      ) : null}

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <SurfaceSection title="Package Preview" eyebrow="Normalized package" description="Compact operational preview of the stored normalized package rather than a raw JSON dump.">
          {preview.state === 'missing' ? (
            <EmptyState title="No package attached" detail="Import a package to inspect normalized dimensions, questions, scoring, outputs, and language coverage." />
          ) : preview.state === 'invalid' ? (
            <div className="space-y-4">
              <EmptyState title="Package preview unavailable" detail="The latest import did not produce a normalized package. Resolve the blocking validation issues below and re-import." />
              <EvidenceList items={preview.errors} tone="rose" />
              <EvidenceList items={preview.warnings} tone="amber" />
            </div>
          ) : (
            <div className="space-y-5">
              <MetaGrid
                columns={2}
                items={[
                  { label: 'Dimensions summary', value: preview.dimensionsSummary },
                  { label: 'Questions summary', value: preview.questionSummary },
                  { label: 'Scoring / normalization', value: preview.scoringSummary },
                  { label: 'Outputs / language', value: `${preview.outputsSummary} ${preview.languageSummary}` },
                  { label: 'Validation state', value: preview.validationSummary },
                  { label: 'Last import', value: preview.lastImportedSummary },
                ]}
              />

              <div className="grid gap-4 xl:grid-cols-2">
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Dimensions</p>
                  <Table
                    columns={['Dimension', 'Label key', 'Scale metadata', 'Questions']}
                    rows={preview.dimensions.map((dimension) => [
                      <p key={`${dimension.id}-id`} className="text-sm font-medium text-textPrimary break-all">{dimension.id}</p>,
                      <p key={`${dimension.id}-label`} className="text-sm text-textPrimary break-all">{dimension.label}</p>,
                      <p key={`${dimension.id}-scales`} className="text-sm text-textPrimary">{dimension.scaleIds.length ? dimension.scaleIds.join(', ') : 'No scale metadata'}</p>,
                      <p key={`${dimension.id}-count`} className="text-sm text-textPrimary">{dimension.questionCount}</p>,
                    ])}
                  />
                </div>
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Questions</p>
                  <Table
                    columns={['Question', 'Prompt excerpt', 'Options', 'Mapped dimensions']}
                    rows={preview.questions.slice(0, 12).map((question) => [
                      <p key={`${question.id}-id`} className="text-sm font-medium text-textPrimary break-all">{question.id}</p>,
                      <p key={`${question.id}-prompt`} className="text-sm text-textPrimary break-all">{question.prompt}</p>,
                      <p key={`${question.id}-options`} className="text-sm text-textPrimary">{question.optionCount}</p>,
                      <p key={`${question.id}-dimensions`} className="text-sm text-textPrimary break-all">{question.mappedDimensions.join(', ')}</p>,
                    ])}
                  />
                  {preview.questions.length > 12 ? <p className="text-xs text-textSecondary">Showing the first 12 questions for compact review.</p> : null}
                </div>
              </div>
            </div>
          )}
        </SurfaceSection>

        <SurfaceSection title="Publish Readiness" eyebrow="Evidence checklist" description="Readiness goes beyond schema validation to show what is publishable now and what still needs attention.">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge label={formatReadinessLabel(readiness.status)} tone={getReadinessTone(readiness.status)} />
              <p className="text-sm text-textSecondary">{readiness.summary}</p>
            </div>

            <Table
              columns={['Check', 'Status', 'Detail']}
              rows={readiness.checks.map((item) => [
                <p key={`${item.key}-label`} className="text-sm font-medium text-textPrimary">{item.label}</p>,
                <Badge key={`${item.key}-status`} label={item.status} tone={item.status === 'pass' ? 'emerald' : item.status === 'warning' ? 'amber' : 'rose'} />,
                <p key={`${item.key}-detail`} className="text-sm text-textPrimary">{item.detail}</p>,
              ])}
            />

            {readiness.blockingIssues.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Blocking issues</p>
                <EvidenceList items={readiness.blockingIssues} tone="rose" />
              </div>
            ) : null}

            {readiness.warnings.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Warnings</p>
                <EvidenceList items={readiness.warnings} tone="amber" />
              </div>
            ) : null}

            <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={simulationStatus.statusLabel} tone={simulationStatus.canRunSimulation ? 'sky' : 'rose'} />
                <p className="text-sm text-textSecondary">{simulationStatus.summary}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge label={reportPreviewStatus.statusLabel} tone={reportPreviewStatus.canGeneratePreview ? 'sky' : 'rose'} />
                <p className="text-sm text-textSecondary">{reportPreviewStatus.summary}</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/simulate`} variant="secondary">Open simulation workspace</Button>
                <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/report-preview`} variant="ghost">Open report preview</Button>
                <Button href={`/admin/assessments/${detailData.assessment.id}/versions/${safeVersion.versionLabel}/scenarios`} variant="ghost">Open scenario library</Button>
              </div>
            </div>
          </div>
        </SurfaceSection>
      </div>

      <SurfaceSection title="Diff" eyebrow="Version comparison" description="Structured operational comparison against the strongest truthful baseline for this version.">
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Badge label={diff.baseline ? `Baseline v${diff.baseline.versionLabel}` : 'First version'} tone={diff.baseline ? 'sky' : 'slate'} />
            <Badge label={diff.materiallyDifferent ? 'Materially different' : 'No material change'} tone={diff.materiallyDifferent ? 'violet' : 'slate'} />
            <p className="text-sm text-textSecondary">{diff.summary}</p>
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-3 rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Diff summary</p>
              <ul className="space-y-2 text-sm leading-6 text-textPrimary">
                {diff.summaryLines.map((line) => <li key={line}>• {line}</li>)}
              </ul>
            </div>
            <Table
              columns={['Area', 'Added', 'Removed', 'Changed']}
              rows={[
                [
                  <p key="dimensions-area" className="text-sm font-medium text-textPrimary">Dimensions</p>,
                  <p key="dimensions-added" className="text-sm text-textPrimary break-all">{diff.dimensions.added.length ? diff.dimensions.added.join(', ') : '—'}</p>,
                  <p key="dimensions-removed" className="text-sm text-textPrimary break-all">{diff.dimensions.removed.length ? diff.dimensions.removed.join(', ') : '—'}</p>,
                  <p key="dimensions-changed" className="text-sm text-textPrimary break-all">{diff.dimensions.changed.length ? diff.dimensions.changed.join(', ') : '—'}</p>,
                ],
                [
                  <p key="questions-area" className="text-sm font-medium text-textPrimary">Questions</p>,
                  <p key="questions-added" className="text-sm text-textPrimary break-all">{diff.questions.added.length ? diff.questions.added.join(', ') : '—'}</p>,
                  <p key="questions-removed" className="text-sm text-textPrimary break-all">{diff.questions.removed.length ? diff.questions.removed.join(', ') : '—'}</p>,
                  <p key="questions-changed" className="text-sm text-textPrimary break-all">{diff.questions.changed.length ? diff.questions.changed.join(', ') : '—'}</p>,
                ],
              ]}
            />
          </div>

          {diff.coverageChanges.length || diff.outputLanguageChanges.length || diff.metadataChanges.length ? (
            <div className="grid gap-4 xl:grid-cols-3">
              <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Scoring / normalization</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-textPrimary">
                  {(diff.coverageChanges.length ? diff.coverageChanges : ['No scoring or normalization coverage change detected.']).map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Outputs / language</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-textPrimary">
                  {(diff.outputLanguageChanges.length ? diff.outputLanguageChanges : ['No output or language coverage change detected.']).map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
              <div className="rounded-2xl border border-white/[0.07] bg-bg/50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-textSecondary">Metadata / provenance</p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-textPrimary">
                  {(diff.metadataChanges.length ? diff.metadataChanges : ['No package metadata or provenance change detected.']).map((item) => <li key={item}>• {item}</li>)}
                </ul>
              </div>
            </div>
          ) : null}
        </div>
      </SurfaceSection>

      <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <SurfaceSection title="Validation evidence" eyebrow="Errors + warnings" description="Stored validation output remains visible even after import so admins can review lingering gaps before publish.">
          {packageInfo.errors.length || packageInfo.warnings.length ? (
            <div className="space-y-4">
              {packageInfo.errors.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-200">Errors</p>
                  <EvidenceList items={packageInfo.errors.map((issue) => `${issue.path} · ${issue.message}`)} tone="rose" />
                </div>
              ) : null}
              {packageInfo.warnings.length ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-200">Warnings</p>
                  <EvidenceList items={packageInfo.warnings.map((issue) => `${issue.path} · ${issue.message}`)} tone="amber" />
                </div>
              ) : null}
            </div>
          ) : (
            <EmptyState title="No validation issues stored" detail="The latest validation report has no blocking errors or warnings." />
          )}
        </SurfaceSection>

        <SurfaceSection title="Recent version activity" eyebrow="Audit trail" description="Package import, validation failure, and publish-blocked events stay aligned with the shared admin audit model.">
          {activity.length ? (
            <Table
              columns={["Timestamp", "Event", "Actor", "Summary"]}
              rows={activity.map((event) => [
                <div key={`${event.id}-timestamp`} className="space-y-1">
                  <p className="text-sm font-medium text-textPrimary">{formatAdminTimestamp(event.happenedAt)}</p>
                  <p className="text-xs text-textSecondary">{formatAdminRelativeTime(event.happenedAt)}</p>
                </div>,
                <div key={`${event.id}-event`} className="space-y-2">
                  <Badge label={getAdminAuditEventLabel(event.eventType)} tone={getAdminAuditEventTone(event.eventType, event.source)} />
                  <p className="text-xs text-textSecondary">{event.eventType}</p>
                </div>,
                <div key={`${event.id}-actor`} className="text-sm text-textPrimary">{event.actorName ?? 'System'}</div>,
                <div key={`${event.id}-summary`} className="text-sm leading-6 text-textPrimary">{event.summary}</div>,
              ])}
            />
          ) : (
            <EmptyState title="No activity yet" detail="Import and lifecycle events for this version will appear here once they are recorded." />
          )}
        </SurfaceSection>
      </div>
    </div>
  )
}
