# WPLP-80 Canonical Package Candidate (Contract v2) — Design Notes

This document captures authoring decisions and contract-fit pressure points for `tests/fixtures/package-contract-v2-wplp80-canonical-candidate.json`.

## What this candidate includes

- Full 80-item questionnaire structure sourced from `data/wplp80_questions_v1.csv`.
- 11 ordered sections retained from source data section keys.
- 4-option single-select responses per item (A–D style authored options).
- 45 raw dimensions (signal codes) represented as first-class canonical dimensions.
- 13 derived dimensions (11 family composites + 2 cross-family composites).
- Explicit option-level scoring mappings for all 320 question-option combinations.
- Reverse-keying represented with scoring transforms for all reverse-scored items.
- Integrity rules for contradiction and patterned-response confidence flags.
- Normalization declarations (group metadata + rule declarations).
- Aggregation declarations (comparable groups, distribution groups, team rollup hints).
- Output declarations with report bindings and human-facing interpretive framing language.

## Contract-fit pressure points discovered

1. **No explicit canonical language block for long-form interpretive copy**
   - Category: contract limitation.
   - Detail: v2 canonical supports output block titles, report binding labels, explanations, and question/section text, but does not yet provide a dedicated language catalog for multi-variant narrative packs at package level.
   - Best-fit used: premium, human-facing copy placed in `outputs.reportBindings[].explanation` and `outputs.blocks[].title`.

2. **Normalization-group execution semantics are intentionally narrow**
   - Category: contract limitation.
   - Detail: canonical `normalization.groups` declarations are now preserved into validated runtime input and can be consumed narrowly through `normalization.rules[*].appliesTo.groupKey` target expansion. Groups are still not independently executable without a rule that references them.
   - Best-fit used: preserve complete grouping metadata plus explicit normalization rules, with optional `groupKey` targeting to avoid target duplication.

3. **Response-pattern integrity logic granularity is currently constrained by predicate operands**
   - Category: contract limitation.
   - Detail: predicate operands are scoped to direct question answers, scores, derived scores, constants, and integrity flags. Statistical response-pattern primitives (e.g., long-string index, intra-block entropy) are not first-class.
   - Best-fit used: rule declarations that remain semantically valid with currently supported predicate primitives.

4. **Source-data ambiguity for psychometric weighting beyond provided signal_weight**
   - Category: missing source-data issue.
   - Detail: the source CSV provides one signal mapping per option and `signal_weight`, but does not provide explicit published weighting variance for higher-order composites.
   - Best-fit used: direct signal weights retained; derived composite dimensions use transparent weighted averages with explicit input lists.

## Follow-on recommendations

- Add a canonical `language`/`narrativeCatalog` block to separate localized narrative assets from output trigger declarations.
- Add first-class integrity expression helpers for patterned response quality metrics.
- Clarify whether future WPLP-80 psychometric keys require per-family weighting matrices for derived dimensions.

## Task 2 import/compile pass findings (March 24, 2026)

### What broke in the first real end-to-end run

- The package itself classified and validated, but two previously documented pressure points were effectively silent during import:
  - `normalization.groups` declarations were accepted but dropped from runtime behavior without an explicit diagnostic.
  - `integrity.rules[*].kind = response_pattern` compiled as generic predicates, but there was no explicit compiler warning that advanced response-pattern primitives are still limited.

### Engine fixes made in Task 2

- Added a canonical-validation warning when `normalization.groups` is present to make the metadata-only behavior explicit during import analysis.
- Added a compiler warning for `response_pattern` integrity rules clarifying that advanced statistical response-pattern primitives are not yet first-class runtime semantics.
- Added WPLP-80 regression coverage for:
  - canonical v2 classification,
  - canonical validation,
  - canonical→runtime compilation,
  - runtime-plan compilation,
  - diagnostics boundary partitioning and readiness milestone assertions.

### What remains intentionally deferred

- **Language catalog gap** remains deferred to **Task 3** (contract/runtime authoring model extension), because it does not block import or plan compilation.
- **Full normalization-group execution semantics** remain deferred to **Task 4** (execution/report semantics expansion). Task 2 now surfaces this limitation explicitly at import time.
- **Psychometric source-weight ambiguity** remains a package authoring/data-governance concern and is not resolved by engine compile-path changes.

## Task 3 execution/preview verification findings (March 24, 2026)

### What executed correctly

- WPLP-80 canonical candidate executed end-to-end through the runtime-v2 path via `PreparedRuntimeExecutionBundleV2` and `executeCompiledRuntimePlanV2` using deterministic timestamps and repeatable scenario payloads.
- Representative response-set coverage now includes:
  - balanced/neutral,
  - extreme profile constructions,
  - contradiction-style alternating profiles,
  - missing/skewed edge payloads.
- Runtime stage behavior remained coherent and stage-correct:
  - scoring surfaced explicit missing-response diagnostics in edge cases,
  - derived dimensions resolved without silent dependency failures for valid payloads,
  - normalization entries remained deterministic across repeated identical executions,
  - aggregation/integrity/output instruction ordering remained stable against compiled execution order.
- Admin simulation and report-preview readiness checks remained compatible for both canonical-v2 input and runtime-v2 input produced from the canonical artifact.

### Issues found in Task 3

- No engine execution defects requiring runtime architecture changes were identified in the WPLP-80 verification matrix.
- No compiler defects requiring contract interpretation changes were identified.
- Previously known limitations remained explicit and diagnosable (not silent):
  - `normalization.groups` metadata-only execution status,
  - limited advanced `response_pattern` integrity primitives.

### Fixes made in Task 3

- Added focused WPLP-80 regression tests covering runtime execution determinism, stage-correct diagnostics, output/integrity ordering stability, and preview-path compatibility.
- No runtime-engine or compiler behavior changes were required for this task.

## Task 4 limitation cleanup and production-readiness polish (March 24, 2026)

### Deferred-item classification and decisions

- **Normalization groups**
  - Classification: **should fix now (bounded)**.
  - Decision: implemented a minimal executable behavior only: `normalization.rules[*].appliesTo.groupKey` now resolves and expands to the group's declared dimension/derived-dimension targets during package validation.
  - Explicit non-goal retained: groups remain non-executable metadata unless a rule references them.

- **Advanced response_pattern primitives**
  - Classification: **should explicitly leave deferred**.
  - Decision: no runtime semantic expansion in this pass; existing warning stays to avoid false readiness signals.

- **Broader language/narrative contract expansion**
  - Classification: **should document as package/contract limitation**.
  - Decision: deferred; no schema redesign in this bounded pass.

- **Psychometric weighting ambiguity in source data**
  - Classification: **package/data-governance limitation**.
  - Decision: remains outside engine scope; no engine-side heuristics added.

### Task 4 code-path improvements made

- Added validated import support for `normalization.groups` in runtime-contract v2 input.
- Added rule-target expansion from `appliesTo.groupKey` to concrete dimension/derived-dimension targets for deterministic runtime execution planning.
- Added explicit validation erroring for unknown normalization `groupKey` references.
- Kept canonical warning honest by only emitting metadata-only messaging when groups exist but no normalization rule references them via `groupKey`.
- Added regression coverage for:
  - successful groupKey-driven normalization target expansion,
  - explicit failure on missing normalization group references.

### Remaining intentional deferrals after Task 4

- Advanced statistical response-pattern primitives beyond the current predicate model.
- Broader language/narrative-catalog contract expansion.
- Source psychometric weighting ambiguity resolution (authoring/data governance).

### Production-readiness status

- WPLP-80 remains deterministic and stable across canonical import, compile, runtime execution, simulation, and preview compatibility checks.
- With the bounded normalization-group fix in place and explicit diagnostics preserved, WPLP-80 is suitable for a real admin import exercise.
- Recommended next step: run a controlled admin import rehearsal using the full candidate package and capture operator feedback on diagnostics clarity before broader rollout.

### New pressure points observed

- Scenario generation for profile-shape validation depends on available option-level score maps and does not guarantee monotonic movement of any single raw dimension in all authored item families; this is a test-fixture realism/authoring nuance rather than an execution-engine defect.
