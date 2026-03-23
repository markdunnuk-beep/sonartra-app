# Sonartra MVP data alignment and cleanup plan

This document describes the conservative in-place cleanup path for aligning a live Sonartra admin/app database back to the intended MVP baseline after demo or seed data has accumulated.

## Scope and non-goals

This workflow is **data-only**.

It is explicitly designed to avoid:

- dropping or recreating the database
- editing `schema_migrations`
- renaming migrations or changing migration history
- destructive schema changes

## Data model categories

### 1. Protected governance tables — never touch

These tables are migration/runtime governance and are intentionally excluded from the reset tool:

- `schema_migrations`
- `admin_roles`

Why:

- `schema_migrations` is the source of truth for applied migration history and must remain auditable.
- `admin_roles` is static role catalogue data inserted by migrations and referenced by `admin_identity_roles`.

### 2. Auth/admin linkage tables — selective cleanup only

These tables are sensitive because they participate in sign-in reconciliation, owner/admin visibility, or both:

- `users`
- `admin_identities`
- `admin_identity_roles`
- `organisation_memberships`
- `access_audit_events`

Operational policy:

- preserve the real owner `users` row whenever possible
- preserve the owner `admin_identities` row when it can be resolved safely
- clear demo role assignments, memberships, and audit rows after backup/export
- rely on existing app/admin rehydration flows to reconcile the owner again if needed

Relevant runtime behavior already present in the repo:

- app sign-in resolves or upserts the `users` row by `external_auth_id` first and then by email. See `lib/server/auth.ts`.
- admin mutation flows can also create or reconcile `admin_identities` by `auth_subject` or email when a privileged actor signs in and performs admin actions. See `lib/admin/server/assessment-management.ts` and `lib/admin/server/organisation-memberships.ts`.
- the bootstrap bridge can rebuild `admin_identities`, `organisation_memberships`, and `admin_identity_roles` from legacy `users` and `organisation_members` without relying on the demo seed migration. See `scripts/bootstrap-admin-access-registry.ts` and `docs/admin-access-registry-bootstrap.md`.

### 3. User/org business-state tables — usually selective cleanup

These hold tenant and membership state visible in app/admin:

- `organisations`
- `organisation_members`

Operational policy:

- delete demo organisations and memberships by default
- only preserve an organisation when an explicit baseline organisation is known and intentionally passed to the tool
- avoid keeping “maybe real” organisations by accident; ambiguous org rows should be exported first and then reviewed manually

### 4. Assessment content/runtime tables — generally safe to clear after export

#### Runtime/attempt state

- `assessment_result_signals`
- `assessment_results`
- `assessment_score_snapshots`
- `assessment_responses`
- `assessments`

#### Admin content / materialized package state

- `assessment_saved_scenarios`
- `assessment_version_saved_scenarios`
- `assessment_option_signal_mappings`
- `assessment_question_options`
- `assessment_questions`
- `assessment_question_sets`
- `assessment_versions`
- `assessment_definitions`

Operational policy:

- clear runtime attempts/results first
- clear question-bank/runtime materialization and saved-scenario tables next
- remove imported/demo assessment catalogue rows while optionally preserving a scrubbed baseline shell version key (default preserved key: `wplp80-v1`)
- do **not** leave package payloads, saved scenarios, or materialized runtime rows attached to preserved shells

## Dependency-aware reference map

The schema/migration chain in this repository establishes the following important references:

- `organisation_members.organisation_id -> organisations.id`
- `organisation_members.user_id -> users.id`
- `assessments.user_id -> users.id`
- `assessments.organisation_id -> organisations.id`
- `assessments.assessment_version_id -> assessment_versions.id`
- `assessment_responses.assessment_id -> assessments.id`
- `assessment_score_snapshots.assessment_id -> assessments.id`
- `assessment_results.assessment_id -> assessments.id`
- `assessment_results.assessment_version_id -> assessment_versions.id`
- `assessment_result_signals.assessment_result_id -> assessment_results.id`
- `assessment_question_sets.assessment_version_id -> assessment_versions.id`
- `assessment_questions.question_set_id -> assessment_question_sets.id`
- `assessment_question_options.question_id -> assessment_questions.id`
- `assessment_option_signal_mappings.question_option_id -> assessment_question_options.id`
- `assessment_saved_scenarios.assessment_definition_id -> assessment_definitions.id`
- `assessment_saved_scenarios.assessment_version_id -> assessment_versions.id`
- `assessment_version_saved_scenarios.assessment_version_id -> assessment_versions.id`
- `admin_identity_roles.identity_id -> admin_identities.id`
- `admin_identity_roles.role_id -> admin_roles.id`
- `admin_identity_roles.organisation_id -> organisations.id`
- `organisation_memberships.identity_id -> admin_identities.id`
- `organisation_memberships.organisation_id -> organisations.id`
- `access_audit_events.identity_id -> admin_identities.id`
- `access_audit_events.organisation_id -> organisations.id`

## Recommended cleanup strategy

### Why not do a blanket wipe of all app tables?

A blanket wipe is riskier than necessary because:

1. the real owner must still be able to sign in cleanly
2. `users` and `admin_identities` may contain the only trustworthy linkage back to the real authenticated account
3. `admin_roles` and `schema_migrations` are governance/static tables, not demo data
4. preserving a minimal owner row dramatically lowers recovery risk if the live environment must be rehydrated quickly

### Conservative strategy used here

1. **Back up first**
   - export data-only backups for user/org tables, admin registry tables, assessment runtime tables, and assessment content tables
   - save a schema-only dump for forensics
2. **Resolve the owner before deletion**
   - preserve by `users.id`, email, or `external_auth_id`
   - optionally preserve matching `admin_identities.id`
3. **Delete in dependency order**
   - assessment runtime descendants
   - assessment runtime parents
   - admin audit and linkage rows
   - organisation membership rows
   - organisations
   - assessment package/materialization rows
   - non-owner users last
4. **Prefer deleting demo/org/runtime data, not governance state**
   - never touch `schema_migrations`
   - never touch `admin_roles`
5. **Preserve or scrub, don’t half-keep demo package state**
   - if a baseline shell version is preserved, scrub it back to draft/unpublished and remove package payload/runtime artifacts
6. **Rebuild intentionally after cleanup**
   - owner signs in
   - app user row is verified or rehydrated
   - admin identity linkage is verified or rebuilt
   - baseline organisation is created intentionally only if desired
   - real assessment packages are imported afterward

## Tooling added in this repo

### Read-only audit / optional apply

```bash
npx tsx scripts/align-mvp-baseline.ts --owner-email owner@example.com
```

Apply only after backup/export review:

```bash
npx tsx scripts/align-mvp-baseline.ts \
  --apply \
  --confirm ALIGN_MVP_BASELINE \
  --owner-email owner@example.com
```

Optional flags:

- `--owner-user-id <uuid>`
- `--owner-external-auth-id <subject>`
- `--preserve-organisation-ids <uuid,uuid>`
- `--preserve-assessment-version-keys <key,key>`
- `--clear-assessment-shells` if the assessment catalogue should become completely empty
- `--allow-empty-users` (dangerous; for deliberate full user wipe only)
- `--json`

### Post-cleanup verification

```bash
npx tsx scripts/verify-mvp-baseline.ts --owner-user-id <users.id> --owner-admin-identity-id <admin_identities.id>
```

## Post-cleanup re-baseline flow

1. Sign in as the real owner/admin.
2. Confirm the app-side `users` row still exists.
   - If it does not, let normal sign-in rehydrate it via the existing `resolveAuthenticatedAppUser` path.
3. Confirm the owner email is still present in `SONARTRA_ADMIN_EMAILS` so admin access remains intentionally gated.
4. If `admin_identities` was cleared or partially preserved, either:
   - allow an admin mutation flow to rebind the owner identity by email/auth subject, or
   - run the bootstrap bridge after intentionally recreating the desired legacy org membership state.
5. Create or verify the baseline organisation state.
   - If the intended baseline is “no tenant yet”, leave `organisations`, `organisation_members`, and `organisation_memberships` empty.
   - If a single real organisation should exist, create it deliberately and then add the owner membership.
6. Confirm the assessment registry state.
   - Either empty or reduced to scrubbed baseline shell versions only.
   - No question bank/runtime materialization rows.
   - No saved scenarios.
   - No historical assessment attempts/results.
7. Import the first real assessment package.
8. Re-run verification and spot-check admin pages.

## Operational risks still requiring human review

- If the real owner email is unknown, **do not** run `--apply` without an explicit preservation plan.
- If any organisation row may be real production data, export and review it before deletion.
- If a live assessment package should remain published, do not use the default cleanup plan unchanged; preserve that definition/version intentionally instead.
