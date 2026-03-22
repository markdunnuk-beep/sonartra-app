# Admin assessment_versions compatibility note

## Established policy

For `assessment_versions`, treat newer package-era, governance, and regression fields as capability-driven rather than universally available.

- **Capability-driven reads:** read queries should inspect schema capabilities first and project safe fallbacks (`null`, `updated_at`, or default readiness state) when optional `assessment_versions` columns are absent.
- **Explicit write gating:** mutation paths that need optional `assessment_versions` columns must declare the required columns up front and fail with a `schema_incompatible` result instead of relying on raw database errors.
- **Migration-required writes vs safely degradable writes:**
  - Safely degradable behavior is acceptable for **reads** and for write-side follow-up work that can be skipped without corrupting state, such as opportunistic readiness refreshes after package/scenario activity.
  - Migration-required writes are required for changes whose meaning depends on optional columns being persisted correctly, such as package metadata persistence, release readiness persistence, sign-off state changes, release-note persistence, and regression snapshot persistence.

## Current compatibility coverage

### Covered by the compatibility pattern

- `lib/admin/server/assessment-version-schema-capabilities.ts` centralizes optional package-era, governance, and regression column discovery for `assessment_versions`.
- `lib/admin/server/assessment-version-detail-sql.ts` keeps detail reads capability-driven, including package-era projections/joins plus governance/regression fallbacks when optional columns are missing.
- `lib/admin/server/assessment-management.ts` uses the same capability snapshot for admin detail reads and explicit write gating for package metadata, release readiness, sign-off, release notes, and regression snapshot writes. Migration-required writes now return `schema_incompatible` instead of surfacing raw SQL failures.
- `lib/admin/server/assessment-regression.ts` loads version detail through the shared capability-driven SQL builder, so package-era compatibility reads follow the same policy there too.

### Remaining scope notes

- Compatibility coverage here is specifically for optional `assessment_versions` columns introduced across the package-era (`0008`) and governance/regression migrations (`0009`/`0010`). It does not imply broad compatibility for unrelated admin tables if those tables are missing entirely.
- Keep new `assessment_versions` reads capability-driven by default, and classify new writes up front as either migration-required writes or safely degradable writes before adding SQL.

## Terminology guide for future changes

- **Capability-driven reads:** branch on discovered schema columns and project safe fallbacks.
- **Explicit write gating:** check required columns before executing a mutation path.
- **Migration-required writes:** fail fast with `schema_incompatible` when required optional columns are unavailable.
- **Safely degradable writes:** skip optional follow-up persistence when doing so does not corrupt or misstate version state.
- **Package-era compatibility:** the same policy applied to `assessment_versions` columns introduced for package import metadata, not just governance/regression fields.
