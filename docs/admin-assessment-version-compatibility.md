# Admin assessment_versions compatibility note

## Established policy

For `assessment_versions`, treat newer optional governance/regression fields as capability-driven rather than universally available.

- **Capability-driven reads:** read queries should inspect schema capabilities first and project safe fallbacks (`null`, `updated_at`, or default readiness state) when optional governance/regression columns are absent.
- **Explicit write gating:** mutation paths that need optional governance/regression columns must declare the required columns up front and fail with a `schema_incompatible` result instead of relying on raw database errors.
- **Migration-required vs safely degradable writes:**
  - Safely degradable behavior is acceptable for **reads** and for write-side follow-up work that can be skipped without corrupting state, such as opportunistic readiness refreshes after package/scenario activity.
  - Migration-required behavior is required for writes whose meaning depends on the optional columns being persisted correctly, such as release readiness persistence, sign-off state changes, release-note persistence, and regression snapshot persistence.

## Post-refactor audit inventory

### Already aligned with the new compatibility pattern

- `lib/admin/server/assessment-version-schema-capabilities.ts` centralizes optional governance/regression column discovery for `assessment_versions`.
- `lib/admin/server/assessment-version-detail-sql.ts` uses capability-aware projections and joins so detail reads degrade safely when governance/regression columns are missing.
- `lib/admin/server/assessment-management.ts` applies the pattern for governance/regression reads and for explicitly gated writes (`release_readiness`, `release_sign_off`, `release_notes`, `regression_snapshot`), including `schema_incompatible` responses instead of uncaught SQL errors.

### Still needing read-path hardening

- `lib/admin/server/assessment-management.ts` still has package-oriented read paths that assume the 0008 package columns exist (`package_status`, `package_schema_version`, `package_source_type`, `package_imported_at`, `package_source_filename`, `package_imported_by_identity_id`, `package_validation_report_json`, and `definition_payload`). These reads are modern-schema-only today even though governance/regression reads were hardened.
- `lib/admin/server/assessment-regression.ts` still loads version/package data through direct `assessment_versions` projections with no schema capability check, so older schemas missing package-era columns will still fail as raw database errors.

### Still needing write-path hardening

- `lib/admin/server/assessment-management.ts` package import remains a modern-schema-only write path. It writes package-era optional columns directly and does not yet have the same explicit capability gate used for governance/regression writes. If legacy package-column support still matters, this is the next write path to harden.

## Practical follow-up priority

1. If older pre-0008 environments still need to boot admin assessment tooling, add a package-column capability helper parallel to the governance/regression helper and route package-dependent reads through it.
2. Add an explicit migration-required gate for package import writes so unsupported schemas return a clear compatibility result instead of an opaque database failure.
3. Leave the current governance/regression pattern in place; that portion of the refactor looks internally consistent.
