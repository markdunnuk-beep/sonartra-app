# Package Contract v2

## Purpose

Package Contract v2 is the canonical authoring contract for Sonartra assessments that need more structure than the legacy package model can safely express. It is intentionally **WPLP-80-first**: the contract is broad enough to support a small family of premium, high-complexity assessments, but constrained enough for deterministic compilation, scoring, normalization, integrity checks, and reporting later.

This layer defines:
- package identity and provenance
- assessment structure
- stable question/option/dimension keys
- scoring declarations
- reverse/transform declarations
- derived dimension declarations
- integrity and contradiction rule declarations
- normalization metadata
- aggregation-ready grouping hints
- output/report input declarations

This layer does **not** implement execution. It exists so later runtime/compiler prompts can consume one stable source of truth.

## Canonical top-level structure

The canonical v2 authoring shape is:

- `identity`
  - typed package identity, versioning, language, authoring, and provenance metadata
- `structure`
  - sections and questions, including stable ids, order, prompt text, and single-select options
- `dimensionCatalog`
  - raw dimensions, derived dimensions, and dimension groups
- `scoring`
  - per-question/per-option target mappings, plus transforms and scoring rules
- `integrity`
  - contradiction, consistency, and response-quality rule declarations
- `normalization`
  - normalization groups and normalization rule metadata
- `aggregation`
  - comparable groups, distribution groups, and roll-up hints for later team/org analytics
- `outputs`
  - output block declarations and report bindings consumed by later report/output stages

The validator normalizes this canonical shape into the existing executable-friendly v2 structure so current compiler/runtime-adjacent code can stay isolated while the foundation contract evolves.

## Why this is WPLP-80-first instead of infinitely generic

The contract is optimized around needs that are already visible in WPLP-80-class assessments:
- grouped sections rather than flat-only questionnaires
- stable question and option ids
- option-level mappings into multiple target dimensions
- positive and negative weighting
- explicit reverse/transform declarations
- raw plus derived dimensions
- contradiction/integrity declarations
- normalization and aggregation metadata for future team/org outputs
- output block declarations instead of implicit report logic

What it deliberately avoids:
- unrestricted custom code in packages
- vague metadata blobs for critical runtime fields
- assumptions about a hardcoded Sonartra signal registry
- over-general “anything goes” expression systems that would be difficult to compile safely

## Field guide

### `identity`
Use this for typed package metadata only. Critical identity fields should live here, not inside free-form metadata bags.

Key fields:
- `assessmentKey`
- `slug`
- `versionLabel`
- `title`
- `shortDescription`
- `category`
- `status`
- `supportedLanguages`
- `authoring`
- `provenance`

### `structure`
This is the questionnaire layout.

Key fields:
- `sections[]`
  - stable `id`
  - `order`
  - title/description
  - optional runtime-ignorable presentation hints
- `questions[]`
  - stable `id`
  - stable display/reference `key`
  - prompt/help text
  - `sectionId`
  - `order`
  - typed `type`
  - strongly typed options with stable ids and order

### `dimensionCatalog`
This is the package-defined scoring/result vocabulary.

Key fields:
- `dimensions[]`
  - stable `key`
  - label/description
  - grouping/family metadata
  - visibility/report hints
- `derivedDimensions[]`
  - stable `key`
  - declarative `rule`
  - explicit input dependencies
- `groups[]`
  - stable group keys that later analytics/output stages can reuse

### `scoring`
This is the declaration layer for how answers feed raw dimensions.

Key fields:
- `optionMappings[]`
  - references a specific `questionId` + `optionId`
  - maps to one or more `dimensionKey` targets
  - supports positive and negative numeric weights
- `transforms[]`
  - reverse scoring and other deterministic transforms
- `rules[]`
  - constrained predicate/effect declarations for later compiler/scorer stages

### `integrity`
Defines contradiction, consistency, and suspicious-pattern declarations. These are package-authored rule inputs only; later prompts will evaluate them.

### `normalization`
Defines how dimensions should normalize together later.

Key fields:
- `groups[]`
  - stable normalization sets
  - comparison order and display/ranking grouping hints
- `rules[]`
  - normalization metadata for raw and/or derived dimensions

### `aggregation`
Keeps future team/org outputs possible without redesigning the contract.

Key fields:
- `comparableGroups[]`
- `distributionGroups[]`
- `rollupHints[]`

These declarations do not build org analytics yet. They simply preserve comparable sets and roll-up semantics now.

### `outputs`
Defines report-generation inputs without generating the report.

Key fields:
- `blocks[]`
  - stable output block ids/keys
  - type, title, audience, priority
  - predicate conditions and dependency references
- `reportBindings[]`
  - stable narrative/report binding ids used by later output stages

## Validation/parsing behavior

The v2 validator now supports two authoring paths:
1. the newer canonical WPLP-80-first contract described above
2. the pre-existing additive v2 shape already used by the current compiler/evaluator path

This preserves a clear boundary between:
- legacy v1 package handling
- v2 package handling
- canonical v2 authoring vs executable-friendly normalized v2 data

Validation currently checks:
- required identity and structural fields
- duplicate ids/keys
- unknown section/question/dimension references
- malformed option-level scoring declarations
- malformed derived dimension declarations
- malformed integrity and output declarations
- broken normalization group references
- broken aggregation metadata references
- report binding references

Warnings are kept separate from fatal validation errors so operators can distinguish “importable but incomplete” from “blocked”.

## What this prompt intentionally does not implement yet

This prompt does **not** implement:
- scoring execution
- compilation redesign
- publishing/materialization flow changes
- admin simulation redesign
- normalization execution
- derived dimension execution
- integrity rule execution
- output/report rendering execution
- organisational analytics execution

Those later stages should consume this contract rather than redesign it.

## How later prompts will consume it

- **Compiler/runtime contract** will take the validated package and build a narrower execution shape.
- **Scoring** will evaluate `scoring.optionMappings`, `transforms`, and `rules`.
- **Derived scoring** will use `dimensionCatalog.derivedDimensions`.
- **Integrity checks** will evaluate `integrity.rules`.
- **Normalization** will use `normalization.groups` and `normalization.rules`.
- **Org/team analytics** will use `aggregation` metadata plus stable dimension keys.
- **Output/report generation** will use `outputs.blocks` and `outputs.reportBindings`.

## Fixture coverage

`tests/fixtures/package-contract-v2-wplp80-foundation.json` is a representative WPLP-80-style foundation fixture. It includes:
- multiple sections and ordered questions
- single-select options with stable ids
- multiple raw dimensions plus one derived dimension
- multi-target option scoring with positive and negative weights
- a reverse-scoring transform declaration
- an integrity contradiction rule
- normalization groups and rules
- aggregation metadata for future team/org rollups
- output blocks plus report bindings

It is intentionally not the final WPLP-80 package. It exists to pressure-test the contract shape.

## Executable runtime contract v2

Prompt 2 introduces a **first-class executable runtime contract v2** as a separate, explicit package shape. This runtime contract is intentionally distinct from the canonical authoring contract.

### Why a separate runtime contract exists

The canonical contract is authored for humans and package tooling. The runtime contract is compiled for deterministic execution.

Canonical contract concerns:
- rich authoring metadata
- authoring-first structure and declarations
- package editing/import ergonomics

Runtime contract concerns:
- deterministic ids and resolved references
- explicit item bank, dimensions, scoring instructions, and rule blocks
- runtime-safe declarations for scoring, derived dimensions, integrity checks, normalization, aggregation, and output rule execution

### Runtime contract v2 shape (high-level)

`lib/admin/domain/package-runtime-v2.ts` defines the executable runtime package shape and parser/validator.

Top-level runtime areas:
- `metadata`
- `itemBank`
- `dimensions`
- `scoring`
- `integrity`
- `normalization`
- `aggregation`
- `outputs`
- optional `diagnostics`

Runtime packages are identified by:
- `contractKind: "runtime_v2"`
- `packageVersion: "2"`
- `metadata.runtimeSchemaVersion: "sonartra-assessment-runtime-package/v2"`

### Compiler target adapter (canonical -> runtime)

`compileCanonicalToRuntimeContractV2` now provides a scoped translation path from canonical v2 to runtime v2.

Current scope:
- structural translation only
- deterministic sorting and reference-safe ids
- runtime contract validation after translation

Current non-goals (still unchanged):
- generic scoring executor
- generic normalizer
- integrity/output rule execution engine
- full publish/materialization migration
- simulation/preview runtime replacement

### Intended downstream consumers

Later prompts should consume runtime contract v2 directly for:
- generic scorer
- derived dimension executor
- integrity/contradiction evaluator
- normalizer
- aggregation layer
- output rule engine
- simulation and preview runtime flows
- publish/runtime materialization

This avoids coupling those systems to legacy normalized v2 shapes.
