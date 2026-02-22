-- Add username and show_real_name columns to users
ALTER TABLE users ADD COLUMN username VARCHAR(30) UNIQUE;
ALTER TABLE users ADD COLUMN show_real_name BOOLEAN NOT NULL DEFAULT false;

-- Index for fast username lookups
CREATE INDEX idx_users_username ON users (username) WHERE username IS NOT NULL;
