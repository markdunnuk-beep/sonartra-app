# Migration audit workflow

Use the migration audit to compare the checked-in migration set with the migration history recorded in `public.schema_migrations` without applying or repairing anything.

## What it checks

The audit is read-only and reports:

- migrations present in `db/migrations` but not recorded in `public.schema_migrations`
- migrations recorded in `public.schema_migrations` but missing from `db/migrations`
- grandfathered duplicate migration-prefix groups encountered in source
- applied-order anomalies inferred from `schema_migrations.applied_at`
- optional schema sanity checks for critical tables in the target schema

## Command

```bash
npm run db:audit:migrations -- --target=<label>
```

Optional flags:

- `--schema=public` to inspect a schema other than `public` for the schema-sanity section
- `--schema-sanity` to validate critical table presence and required columns
- `INCLUDE_SEED_MIGRATIONS=true` if you intentionally want `_seed.sql` files included in the source comparison

## Examples

### Local

```bash
DATABASE_URL="postgres://postgres:postgres@127.0.0.1:54322/postgres" \
  npm run db:audit:migrations -- --target=local --schema-sanity
```

### Staging

```bash
DATABASE_URL="$STAGING_DATABASE_URL" \
  npm run db:audit:migrations -- --target=staging --schema-sanity
```

### Production

```bash
DATABASE_URL="$PRODUCTION_DATABASE_URL" \
  npm run db:audit:migrations -- --target=production --schema-sanity
```

## Interpreting the result

- `Summary: PASS` means the checked-in migrations align with `public.schema_migrations`, no inferred ordering anomalies were detected, and the optional schema sanity section found the expected critical tables and columns.
- `Summary: FAIL` means at least one mismatch was found. The script prints the exact migration IDs or table/column gaps so an operator can investigate safely.

## Safety notes

- The audit opens a `BEGIN READ ONLY` transaction before reading `public.schema_migrations` and schema metadata.
- The script never calls the migration runner and never inserts into `public.schema_migrations`.
- Row counts in the schema-sanity section are informational only; they are not used to repair data.
