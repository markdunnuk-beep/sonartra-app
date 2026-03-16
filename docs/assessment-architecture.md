# Sonartra Block 1: Assessment Data Architecture

## Schema overview

Block 1 introduces a normalized persistence layer in Postgres for:

- Identity and account ownership (`users`, `organisations`, `organisation_members`)
- Versioned assessment definitions (`assessment_versions`)
- Assessment attempts (`assessments`)
- Atomic answer storage (`assessment_responses`)
- Future scoring snapshots (`assessment_score_snapshots`)

The migration for this block is in `db/migrations/0001_assessment_foundation.sql` and includes:

- UUID primary keys
- FK relationships and delete behavior
- Status check constraints
- response/question validation constraints
- supporting indexes for API query patterns
- `updated_at` trigger management
- seed data for `wplp80-v1`

## Assessment lifecycle (Block 1)

1. `POST /api/assessments/start`
   - Resolves an active assessment version (default `wplp80-v1`)
   - Creates a new `assessments` row with initial operational status
2. `POST /api/assessments/response`
   - Validates payload bounds server-side
   - Upserts per-question response with change tracking
   - Recomputes progress from persisted rows only
   - Updates assessment activity and progression fields in the same transaction
3. `GET /api/assessments/[id]`
   - Returns attempt state + linked assessment version + ordered responses for resume flows
4. `POST /api/assessments/complete`
   - Verifies all required responses for the linked version exist
   - Sets `status=completed` and `scoring_status=pending` once complete

## How Block 2 can plug in

Block 2 (assessment delivery/workflow) can build directly on these endpoints by:

- Using `/start` to open an attempt
- Calling `/response` on every answer interaction
- Using `/[id]` for resume/recovery
- Triggering `/complete` once client-side navigation reaches final question

Because progress is computed from durable rows, Block 2 can remain stateless in the UI and rely on persistence as source of truth.

## How Block 4 scoring writes to snapshots

Block 4 should:

1. Select completed assessments where `scoring_status='pending'`
2. Execute scoring logic externally or via workers
3. Insert immutable score artifacts into `assessment_score_snapshots` with:
   - `scoring_version`
   - style outputs
   - raw + derived JSON payloads
   - interpretation JSON for explainability
4. Update `assessments.scoring_status` to `scored` (or `failed` on error)

This preserves auditability and allows rescoring by adding additional snapshot rows per assessment.
