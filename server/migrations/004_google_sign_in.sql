-- Google-only customers do not need a local password.
ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub VARCHAR(255);
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_sub
  ON users (google_sub) WHERE google_sub IS NOT NULL;
