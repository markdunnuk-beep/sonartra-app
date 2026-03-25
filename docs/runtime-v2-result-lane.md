# Runtime V2 result lane (Wave 3)

## Responsibilities
- `lib/server/runtime-v2-scorer.ts`: scores responses using only materialized Runtime Contract V2 execution-model mappings.
- `lib/server/runtime-v2-normalizer.ts`: normalizes signal totals from Runtime V2 registry/config with deterministic ranking.
- `lib/server/runtime-v2-result-builder.ts`: builds one canonical `resultFormat: "runtime_v2"` payload.
- `lib/server/runtime-v2-readiness.ts`: validates canonical payload completeness and maps to `ready|processing|failed`.

## Canonical ready payload requirements
A Runtime V2 result is ready only when:
- `resultFormat === "runtime_v2"`
- metadata includes definition/version/runtime IDs and `runtimeContractVersion: "v2"`
- normalized scores exist and are non-empty
- ranked signals exist and are non-empty
- domain summaries are structurally valid
- overview/top-signal fields are explicit
- diagnostics block exists

## Individual retrieval rule
Individual latest/detail retrieval paths now run the same Runtime V2 readiness validator before surfacing Runtime V2 results. Invalid Runtime V2 payloads are treated as processing/unavailable and logged with structured rejection reasons.

## Remaining after Wave 3
- Generic cross-assessment scorer/normalizer abstraction.
- Output rule engine for richer deterministic narratives.
- Historical-result migration and non-individual flow migration.
- Extended regression matrix beyond WPLP-80 scoped lane.

## Regression guard
`tests/wplp80-runtime-v2-end-to-end.test.ts` is the scoped publish/start/questions/responses/complete/ready/retrieval guard for Runtime V2.
