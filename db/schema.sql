CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE words (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  text TEXT NOT NULL,
  translation TEXT NOT NULL,
  example TEXT,
  source_lang VARCHAR(10),
  target_lang VARCHAR(10),
  interval_days INT DEFAULT 1,
  next_review TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP
);

CREATE INDEX idx_words_user_updated
ON words (user_id, updated_at DESC);