CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  username TEXT,
  email TEXT UNIQUE,
  user_code CHAR(8) UNIQUE NOT NULL,
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

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tags_name
ON tags (name);

CREATE TABLE IF NOT EXISTS word_tags (
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,

  PRIMARY KEY (word_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_word_tags_word
ON word_tags (word_id);

CREATE INDEX IF NOT EXISTS idx_word_tags_tag
ON word_tags (tag_id);

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_words_updated
BEFORE UPDATE ON words
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();
