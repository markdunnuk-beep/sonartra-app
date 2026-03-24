# Hybrid Assessment MVP Architecture Note

## Why we are replacing the generic package-engine direction

For MVP, Sonartra needs a small, high-quality assessment bank (roughly 10 assessments) that can be authored in admin, assigned to individuals, completed in live runtime, and reported deterministically.

The package-engine v2 direction introduced flexibility that is not required for MVP (runtime predicates, rule graphs, package-owned execution logic, and custom normalisation definitions). That flexibility increases implementation risk, validation complexity, and output variance at the stage where deterministic delivery quality is more important than configurability.

## Controlled hybrid model (MVP)

The MVP model is intentionally hybrid:

- **Fixed platform execution structure (Sonartra-owned)**
  - deterministic scoring pipeline
  - deterministic normalisation strategy
  - deterministic output/render pipeline shell
  - fixed aggregation-ready result shape
- **Assessment-configurable content (admin-owned)**
  - metadata and version descriptors
  - question and option content
  - option-to-signal weight mappings
  - signal/domain labels
  - templated narrative copy blocks

This means assessment authors configure content, but cannot ship executable logic.

## Supported assessment style in MVP

The `hybrid_mvp_v1` contract is designed for deterministic scored diagnostics (for example WPLP-80 baseline + focused follow-ons) where:

1. question responses map to weighted signals
2. signals are normalised to a shared output scale
3. ranked and domain-grouped outputs are rendered with platform templates
4. the same signal vectors can later roll up into team/org aggregation views

## Complexity intentionally deferred

The hybrid MVP boundary explicitly defers:

- arbitrary predicate evaluation
- package-defined executable rules
- runtime scripting/dynamic expressions
- free-form derived logic graphs
- general contradiction engines
- per-package normalisation definitions

These can be reconsidered after MVP delivery if product evidence requires them.

## WPLP-80 fit (WPLP-80 / WPLP-80 follow-on planning)

WPLP-80 aligns naturally with this model:

- existing question bank and option mappings already match deterministic signal scoring
- output quality can be raised via standardised narrative templates without custom runtime logic
- resulting signal/domain vectors can be reused for future team/org aggregation layers

In short, WPLP-80 should be treated as a first-class **hybrid_mvp_v1** assessment definition rather than a special runtime engine case.

## Compatibility note for engine-era modules

Legacy package-engine v2 modules remain in the repository for backward compatibility and staged migration. Follow-up work should route new assessment development toward:

- `lib/assessment/hybrid-mvp-contract.ts`
- `lib/results/hybrid-mvp-result-types.ts`

and progressively reduce runtime coupling to package-engine compiler/evaluator abstractions.
