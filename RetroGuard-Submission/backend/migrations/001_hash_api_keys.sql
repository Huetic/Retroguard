-- Migration 001: store contributor API keys as SHA-256 hashes
-- Run manually against the production Postgres database.
-- Safe to re-run: all steps use IF NOT EXISTS / IF EXISTS guards.

-- 1. Add new columns (no-ops if they already exist)
ALTER TABLE contributors
    ADD COLUMN IF NOT EXISTS api_key_hash   VARCHAR(64),
    ADD COLUMN IF NOT EXISTS api_key_prefix VARCHAR(16);

-- 2. Backfill from the existing plaintext api_key column
UPDATE contributors
SET
    api_key_hash   = encode(sha256(api_key::bytea), 'hex'),
    api_key_prefix = LEFT(api_key, 8)
WHERE api_key_hash IS NULL;

-- 3. Apply NOT NULL constraint now that every row is backfilled
ALTER TABLE contributors
    ALTER COLUMN api_key_hash SET NOT NULL;

-- 4. Add unique index on api_key_hash (IF NOT EXISTS prevents duplicate-index error)
CREATE UNIQUE INDEX IF NOT EXISTS ix_contributors_api_key_hash
    ON contributors (api_key_hash);

-- 5. Drop the old unique index on api_key (name matches SQLAlchemy default)
DROP INDEX IF EXISTS ix_contributors_api_key;

-- 6. Drop the old plaintext column
ALTER TABLE contributors
    DROP COLUMN IF EXISTS api_key;
