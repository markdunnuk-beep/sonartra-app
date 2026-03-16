# Sonartra Assessment Data Architecture

## Schema overview

### Block 1 foundations

Block 1 introduces a normalized persistence layer in Postgres for:

- Identity and account ownership (`users`, `organisations`, `organisation_members`)
- Versioned assessment definitions (`assessment_versions`)
- Assessment attempts (`assessments`)
- Atomic answer storage (`assessment_responses`)
- Future scoring snapshots (`assessment_score_snapshots`)

### Block 2A question bank model

Block 2A extends the schema with a normalized question bank for WPLP-80 that avoids question duplication when source data is represented as question + option + signal mapping rows in CSV form.

Relationship chain:

1. `assessment_versions` → `assessment_question_sets`
2. `assessment_question_sets` → `assessment_questions`
3. `assessment_questions` → `assessment_question_options`
4. `assessment_question_options` → `assessment_option_signal_mappings`

Why this shape:

- The source CSV (`data/wplp80_questions_v1.csv`) is normalized and contains repeated question metadata per option row.
- Modeling questions/options/mappings as separate tables preserves source fidelity and prevents duplicate question records.
- Option-level signal mappings remain queryable for scoring, while delivery routes can omit them for lightweight runtime payloads.

The migration files are:

- `db/migrations/0001_assessment_foundation.sql`
- `db/migrations/0002_wplp80_question_bank.sql`

The WPLP-80 v1 import pipeline is:

- `scripts/seed-wplp80-question-bank.mjs`
- `db/seeds/0002_wplp80_question_bank_seed.sql` (portable manual seed for Supabase SQL Editor)
- seed target question set: `wplp80-v1-main` linked to `assessment_versions.key='wplp80-v1'`

Why both seed paths exist:

- The JS script remains the source-driven importer for environments with `DATABASE_URL`.
- The SQL seed exists for manual execution in Supabase SQL Editor when local DB credentials are unavailable.
- Execution order for manual setup is: `db/migrations/0002_wplp80_question_bank.sql` first, then `db/seeds/0002_wplp80_question_bank_seed.sql`.

Import guarantees:

- Upserts are used so reruns are idempotent in practical terms.
- Seed validation enforces exactly 80 questions in the active set.
- Seed validation enforces exactly 4 options per question.

## Assessment lifecycle and APIs

### Block 1 runtime endpoints

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

### Block 2A question delivery endpoints

1. `GET /api/assessment-versions/[versionKey]/questions`
   - Resolves version + active question set
   - Returns ordered active questions with ordered options
   - Excludes option signal mappings from payload
2. `GET /api/assessments/[id]/questions`
   - Resolves assessment → linked version → active question set
   - Returns ordered questions + options for that version
   - Includes saved responses for resume behavior

Block 2B UI consumption guidance:

- Start with `POST /api/assessments/start`.
- Fetch question content from `GET /api/assessments/[id]/questions` (or version route when no attempt exists yet).
- Persist each answer with `POST /api/assessments/response`.
- Treat server payload order (`question_number`, `display_order`) as canonical ordering.

## Forward scoring integration (Block 3)

Block 3 scoring should use the normalized fields now stored in the question bank:

- `assessment_questions.reverse_scored`
- `assessment_questions.question_weight_default`
- `assessment_questions.scoring_family`
- `assessment_option_signal_mappings.signal_code`
- `assessment_option_signal_mappings.signal_weight`

Expected scoring flow:

1. Read responses from `assessment_responses`.
2. Resolve selected option metadata via `question_number` + `response_value` mapping.
3. Join option-to-signal mappings and aggregate weighted signal outputs.
4. Persist scoring artifacts into `assessment_score_snapshots` and update assessment scoring status.
