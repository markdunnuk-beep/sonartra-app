# Runtime Contract V2 Materialization (Wave 2)

## Why dedicated Runtime V2 tables exist

Wave 2 introduces an additive Runtime Contract V2 storage lane (`assessment_runtime_*_v2`) so published execution artifacts are persisted separately from legacy runtime question-bank tables.

This keeps rollout low-risk:
- legacy runtime remains untouched
- v2 execution data is deterministic and isolated
- rematerialization can safely replace only v2 rows for one assessment version

## Authoring vs executable separation

- **Package Contract V2** is the canonical authoring payload.
- **Runtime Contract V2** is the canonical executable payload.
- Publish now enforces a transformation gate from package -> compiled runtime -> materialized runtime rows.

## Publish invariant enforced in Wave 2

For the scoped WPLP-80 individual lane, a version can publish only if all pass:
1. `validatePackageV2`
2. `compilePackageToRuntimeContract`
3. `materializeRuntimeContractV2ForAssessmentVersion`

Any failure blocks publish and prevents lifecycle transition to `published`.

## Scoped rollout target

Wave 2 routing is intentionally scoped:
- WPLP-80 individual start flow resolves published runtime through Runtime V2 materialization presence
- Question delivery reads materialized Runtime V2 tables when available
- Completion path validates input resolution against Runtime V2 materialized questions/options mappings

## What remains for Wave 3+

- full scorer/normalizer consolidation on Runtime Contract V2 data-only execution
- team/org runtime migration
- historical backfill/migration for old results
- legacy runtime table decommission once full parity is verified
