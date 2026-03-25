# Pre-Wave-2 Checklist — Sonartra Assessment Engine Reset

Date: 2026-03-25

## 1) Compiled artifact inspection (WPLP-80)

Verification was executed against the real WPLP-80 Lite fixture (`tests/fixtures/package-contract-v2-wplp80-lite.json`) by deriving the validator/compiler-compatible Package Contract V2 payload and then running:

- `validatePackageV2`
- `compilePackageToRuntimeContract`

Automated via: `scripts/wave2-precheck-wplp80-compile.ts`.

Observed summary:

- definitionId/version: `wplp-80-lite` / `2.0.0-lite.1`
- questionSet count: `4`
- question count: `16`
- option count: `64`
- mapping count: `144`
- every question has expected options: yes (4 options each)
- every option resolves to a valid question: yes
- every option has at least one mapping: yes
- signal registry unique signal key count: `12`
- domain list count: `4` (`behaviour-style`, `culture`, `leadership`, `motivators`)
- deterministic ordering: yes (order + id stable)
- blank/null IDs or malformed text values: none
- normalization prep metadata: `percentage_distribution`, expected signal/domain keys aligned with compiled registry

Mismatch note:

- The full canonical-candidate fixture (`tests/fixtures/package-contract-v2-wplp80-canonical-candidate.json`) is authored in the newer canonical contract shape and is **not** directly accepted by `validatePackageV2` (which validates the additive package shape with `questionSets/questions/options/signalMappings`). This is expected and was explicitly accounted for in the verification script.

## 2) Compiler summary logging

The additive admin canonical compile hook now logs a compact compile fingerprint on success and structured failure summaries for validation/compile failures.

Logged fields on success:

- definitionId
- version
- questionSetCount
- questionCount
- optionCount
- mappingCount
- uniqueSignalCount
- uniqueDomainCount

## 3) Canonical authority declaration

Canonical decision:

- Canonical authoring format: **Package Contract V2**
- Canonical executable format: **Runtime Contract V2**

Decision rule:

- New live execution work must target Runtime Contract V2 only.
- Legacy v1/hybrid paths remain compatibility paths only.
- No new runtime behavior should be added to legacy contracts.

## 4) Runtime table strategy decision

Chosen option: **Option A — materialize compiled Runtime Contract V2 into new dedicated runtime tables.**

Reason:

- Keeps Wave 2 additive and low-risk.
- Avoids overloading legacy runtime schemas with mixed semantics.
- Improves observability and rollback safety during staged cutover.

First read targets:

- WPLP-80
- individual assessment flow only
- `start` → question delivery → completion input resolution path

## 5) Publish invariant

A version is publishable only when all are true:

1. Package Contract V2 validation passes.
2. Runtime Contract V2 compilation succeeds.
3. Compiled runtime artifact is structurally complete.

A TODO architecture comment was added at the publish transition gate to anchor this Wave-2 enforcement rule.

## 6) Current runtime dependency inventory

Focused inventory of existing dependency paths to track during Wave 2 migration:

- `lib/server/save-assessment-response.ts` — still reads `assessment_versions.definition_payload` and parses stored package payload for response-save behavior.
- `lib/server/assessment-completion.ts` — loads `definition_payload` and contains legacy-runtime branch handling when package contract is not v2.
- `lib/server/live-signals-runtime.ts` — published-version resolution with legacy fallback diagnostics and contract-family gating.
- `lib/server/live-assessment-hybrid-mvp.ts` — hard dependency on hybrid MVP payload shape and published definition parsing.
- `lib/admin/domain/assessment-simulation.ts` — explicit legacy simulation fallback branches and legacy-compatible result adapter conversion.
- `lib/server/live-assessment-user-result.ts` — result retrieval and presentation compatibility branching for package-v2 vs non-v2 result payload semantics.
- `app/api/assessment-versions/[versionKey]/questions/route.ts` — version-key-based start/question flow branch path still present.

## 7) First consolidation target scope

Wave 2 consolidation target is **WPLP-80 only, individual assessment flow only, with no team/org rollout and no legacy result migration in this phase.**

## 8) Pre-existing typecheck noise snapshot

Captured from `npm run typecheck` (pre-existing, not introduced by this checklist):

- `tests/assessment-start-route.test.ts` — mocked diagnostic code includes `runtime_not_materialized` not assignable to current `LiveSignalsPublishedVersionDiagnosticCode` union.
- `tests/dashboard-state.test.ts` — mocked `getLatestAssessment` status typed as generic `string` instead of constrained `AssessmentRow['status']` union.
- `tests/wplp80-lite-smoke-path.test.ts` — inferred empty object typing on response-model fixture access (`type`, `optionSetId`, `options`) plus nullable identity assertions.

These failures were observed before Wave 2 implementation work and should be treated as baseline typecheck noise for attribution.

## Go / No-Go recommendation

**GO** for Wave 2 implementation preparation work.

All preconditions are now documented and the additive compile fingerprint logging is in place. Runtime behavior changes should proceed only within the scoped WPLP-80 individual flow and Runtime Contract V2 lane.
