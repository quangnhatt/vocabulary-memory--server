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
  term TEXT NOT NULL,
  translation TEXT NOT NULL,
  example TEXT,
  source_lang VARCHAR(10),
  target_lang VARCHAR(10),
  interval_days INT DEFAULT 1,
  next_review_at TIMESTAMP,
  updated_at TIMESTAMP DEFAULT NOW(),
  deleted_at TIMESTAMP,
  total_reviews INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  tags TEXT[],
  imported_source TEXT,
);

CREATE TABLE system_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  name TEXT NOT NULL,
  description TEXT,

  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,

  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (name, source_lang, target_lang)
);

CREATE TABLE system_vocabularies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  category_id UUID REFERENCES system_categories(id),
  term TEXT NOT NULL,
  translation TEXT NOT NULL,
  example TEXT,

  source_lang TEXT NOT NULL,
  target_lang TEXT NOT NULL,

  popular_score INTEGER NOT NULL DEFAULT 0,

  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sys_vocab_category_id
ON system_vocabularies (category_id)
WHERE deleted_at IS NULL;

-- Search by term
CREATE INDEX idx_sys_vocab_term
ON system_vocabularies (lower(term))
WHERE deleted_at IS NULL;

-- Category browsing
CREATE INDEX idx_sys_vocab_category
ON system_vocabularies (category_name)
WHERE deleted_at IS NULL;

-- Popular vocab
CREATE INDEX idx_sys_vocab_popular
ON system_vocabularies (popular_score DESC)
WHERE deleted_at IS NULL;

-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ALTER TABLE words
-- ALTER COLUMN id SET DEFAULT uuid_generate_v4();

CREATE INDEX idx_words_user_updated
ON words (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES users(id),
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

CREATE TABLE review_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  word_id UUID NOT NULL,

  difficulty TEXT NOT NULL CHECK (
    difficulty IN ('forget', 'good', 'easy')
  ),

  reviewed_at TIMESTAMPTZ NOT NULL,
  turn_id TEXT NOT NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_review_actions_user_time
ON review_actions (user_id, reviewed_at);

CREATE INDEX idx_review_actions_user_turn
ON review_actions (user_id, turn_id);

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
