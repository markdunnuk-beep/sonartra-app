BEGIN;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_external_auth_id_unique
  ON users(external_auth_id)
  WHERE external_auth_id IS NOT NULL;

COMMIT;
