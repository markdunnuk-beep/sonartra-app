# Sonartra Signals E2E Clean-Room Package (`v1-cleanroom`)

## Purpose

`sonartra-signals-e2e-v1-cleanroom.json` is a canonical Package Contract V2 fixture designed for one full Runtime V2 individual-assessment validation run:

import → validate → compile → materialize → publish → start → question delivery → response capture → completion → scoring → normalization → result payload generation → readiness → Individual Results visibility.

## Package identity

- `definitionId`: `sonartra-signals-e2e`
- `version`: `v1-cleanroom`
- `title`: `Sonartra Signals End-to-End Validation Assessment`

## Coverage summary

The package includes all six required domains and canonical signal families:

1. Behaviour Style: Driver, Analyst, Influencer, Stabiliser
2. Motivators: Mastery, Achievement, Influence, Stability
3. Leadership: Results, Vision, People, Process
4. Conflict: Compete, Collaborate, Compromise, Avoid, Accommodate
5. Culture: Performance, Control, Collaboration, Innovation
6. Stress: Control, Overdrive, Withdraw, Support

## Structural counts

- Question sets: **6**
- Questions: **24** (4 per domain)
- Options: **96** (4 per question)
- Signal mappings: **192** (2 mappings per option)
- Unique signals: **25**
- Unique domains: **6**

## Scoring characteristics

- Deterministic IDs and contiguous ordering for all sets/questions/options.
- Every option maps to valid signal keys with numeric weights.
- Primary + secondary weighted mappings provide differentiation while keeping interpretation simple.
- Conflict includes 5-signal coverage across 4 questions with balanced reachability.
- Output generation flags are enabled for rankings, domain summaries, and overview.

## Intended workflow

1. Upload/import `fixtures/packages/sonartra-signals-e2e-v1-cleanroom.json` through admin package import.
2. Run package precheck with:
   - `npx tsx scripts/precheck-sonartra-signals-e2e-package.ts`
3. Publish/materialize runtime version.
4. Execute one end-to-end individual user run.
5. Verify:
   - normalized rankings and top signal
   - domain summaries and overview payloads
   - strengths/watchouts/development-focus generation
   - Individual Results dashboard visibility.

## Sample manual verification answer pattern

A high-intensity path (selecting options that favor Driver / Achievement / Results / Compete / Performance / Overdrive) should typically produce:

- top-ranked signals concentrated in those six signal families,
- lower relative percentages in Stabiliser / Stability / People / Avoid / Collaboration / Support counterparts,
- a clearly differentiated cross-domain profile for dashboard inspection.
