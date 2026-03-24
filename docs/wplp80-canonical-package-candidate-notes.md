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

2. **Normalization groups are metadata-only in canonical-to-runtime normalization path**
   - Category: contract limitation.
   - Detail: canonical `normalization.groups` can define comparison sets, but runtime normalization execution currently depends on rules and does not yet consume group declarations as executable semantics.
   - Best-fit used: preserve complete grouping metadata plus concrete normalization rules to keep future execution options open.

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
