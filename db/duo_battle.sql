
ALTER TABLE users
ADD COLUMN rating INT DEFAULT 1000, -- ELO / ranking
ADD COLUMN  total_xp INT DEFAULT 0;
-- CREATE TABLE users (
--   id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
--   username TEXT NOT NULL UNIQUE,
--   avatar_url TEXT,
--   rating INT DEFAULT 1000, -- ELO / ranking
--   total_xp INT DEFAULT 0,
--   created_at TIMESTAMP DEFAULT NOW()
-- );


CREATE TABLE vocab_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  source_lang TEXT NOT NULL, -- e.g. en
  target_lang TEXT NOT NULL, -- e.g. vi
  difficulty TEXT CHECK (difficulty IN (
    'VERY_EASY','EASY','MEDIUM','HARD','VERY_HARD'
  )),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vocab_pairs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocab_set_id UUID REFERENCES vocab_sets(id) ON DELETE CASCADE,
  word TEXT NOT NULL,
  meaning TEXT NOT NULL
);


CREATE TABLE battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vocab_set_id UUID REFERENCES vocab_sets(id),
  status TEXT CHECK (status IN (
    'WAITING','ACTIVE','FINISHED','CANCELLED'
  )) DEFAULT 'WAITING',
  start_at TIMESTAMP,
  end_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE battle_players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  score INT DEFAULT 0,
  combo INT DEFAULT 0,
  is_winner BOOLEAN DEFAULT FALSE,
  joined_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (battle_id, user_id)
);

CREATE TABLE battle_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID REFERENCES battles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  word_id UUID REFERENCES vocab_pairs(id),
  meaning_id UUID REFERENCES vocab_pairs(id),
  is_correct BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);


CREATE INDEX idx_battle_players_battle
  ON battle_players (battle_id);

CREATE INDEX idx_battle_matches_battle_user
  ON battle_matches (battle_id, user_id);

CREATE INDEX idx_vocab_pairs_set
  ON vocab_pairs (vocab_set_id);

