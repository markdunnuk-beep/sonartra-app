# Admin access registry bootstrap

This bootstrap bridges the existing production schema into the new admin registry without using the demo seed migration.

## Source schema inspected

The current repository-defined production schema exposes the following source tables today:

- `public.users`
  - `id`, `external_auth_id`, `email`, `first_name`, `last_name`, `account_type`, `created_at`, `updated_at`
- `public.organisations`
  - `id`, `name`, `slug`, `plan_tier`, `seat_band`, `status`, `created_at`, `updated_at`, `country`
- `public.organisation_members`
  - `id`, `organisation_id`, `user_id`, `role`, `member_status`, `joined_at`, `created_at`, `updated_at`
- Related activity signal used for recency only:
  - `public.assessments.last_activity_at`, `completed_at`, `started_at`, `updated_at`, `created_at`

## Mapping rules

### `public.users` -> `admin_identities`

- Reuse `users.id` as `admin_identities.id`.
  - Rationale: deterministic reruns and no extra source-id bridge table are needed.
- `email` -> lower-cased `admin_identities.email`
- `first_name` + `last_name` -> `full_name`
  - If both names are absent, fall back to the email local-part so the row remains usable without inventing demo data.
- `external_auth_id` -> `auth_subject`
- `auth_provider` -> `'clerk'` when `external_auth_id` exists
- `created_at` -> `created_at`
- `last_activity_at` -> best available live recency signal from assessments, falling back to `users.updated_at`
- `status`
  - derived from related `organisation_members.member_status`
  - priority: `active` > `invited` > `suspended` > `inactive`
  - users with no membership source default to `active`

### `public.organisation_members` -> `organisation_memberships`

- `user_id` -> `identity_id`
- `organisation_id` -> `organisation_id`
- `role` -> lower-cased `membership_role`
- `member_status` -> constrained target status mapping:
  - `active` -> `active`
  - `invited`, `pending` -> `invited`
  - `suspended` -> `suspended`
  - `inactive`, `disabled`, `removed`, `revoked`, `archived` -> `inactive`
  - unknown values are treated conservatively as `inactive`
- `joined_at` -> `joined_at`
- `invited_at`
  - derived only for invited memberships from `created_at` / `updated_at`
- `last_activity_at`
  - best available organisation-scoped assessment recency, falling back to membership `updated_at`

### `public.organisation_members.role` -> `admin_identity_roles`

Only the following role values are promoted into organisation-scoped admin roles:

- `owner`
- `admin`
- `manager`
- `analyst`

`member` memberships are preserved in `organisation_memberships` but do not receive an `admin_identity_roles` row.

## Internal vs organisation identity classification

Identity type is assigned only from trusted production signals:

1. the existing `SONARTRA_ADMIN_EMAILS` allowlist, or
2. an explicit `users.account_type` value of `internal`, `admin`, `staff`, or `operator`

If neither signal exists:

- users with memberships are classified as `organisation`
- users without memberships are also classified as `organisation` as the safer default
- those no-signal cases are reported as ambiguous in dry-run output

## Internal role assignment policy

This phase does **not** fabricate internal role assignments.

- The current schema exposes an admin allowlist, but it does not encode trustworthy role granularity such as `super_admin` or `support_admin`.
- Therefore internal users may be bootstrapped as `identity_type='internal'` with **no** `admin_identity_roles` rows until a real production role source exists.

## Audit event policy

No legacy audit source table exists in the currently inspected schema, so phase 1 intentionally leaves `access_audit_events` empty.

## Verification queries

```sql
-- Identities by type and status
select identity_type, status, count(*)
from admin_identities
group by identity_type, status
order by identity_type, status;

-- Memberships by membership status
select membership_status, count(*)
from organisation_memberships
group by membership_status
order by membership_status;

-- Role assignments by role key
select ar.key, count(*)
from admin_identity_roles air
join admin_roles ar on ar.id = air.role_id
group by ar.key
order by ar.key;

-- Identities with more than one organisation membership
select identity_id, count(*) as membership_count
from organisation_memberships
group by identity_id
having count(*) > 1
order by membership_count desc, identity_id;

-- Identities with no role assignments
select ai.id, ai.email, ai.identity_type
from admin_identities ai
left join admin_identity_roles air on air.identity_id = ai.id
where air.id is null
order by ai.identity_type, ai.email;

-- Identities with no memberships (valid for internal users)
select ai.id, ai.email, ai.identity_type
from admin_identities ai
left join organisation_memberships om on om.identity_id = ai.id
where om.id is null
order by ai.identity_type, ai.email;
```

## Operational usage

Dry-run first:

```bash
npx tsx scripts/bootstrap-admin-access-registry.ts --dry-run
```

Apply only after reviewing the report:

```bash
npx tsx scripts/bootstrap-admin-access-registry.ts --apply
```
