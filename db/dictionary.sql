
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE TABLE dictionary_word (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word TEXT NOT NULL UNIQUE,
  ipa_uk TEXT,
  ipa_us TEXT,
  language VARCHAR(10) DEFAULT 'en',
  source TEXT DEFAULT 'Cambridge Dictionary',
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE dictionary_entry (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  word_id UUID NOT NULL REFERENCES dictionary_word(id) ON DELETE CASCADE,
  part_of_speech VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT now(),
  UNIQUE (word_id, part_of_speech)
);

CREATE TABLE dictionary_meaning (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entry_id UUID NOT NULL REFERENCES dictionary_entry(id) ON DELETE CASCADE,
  meaning TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE dictionary_example (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  meaning_id UUID NOT NULL REFERENCES dictionary_meaning(id) ON DELETE CASCADE,
  phrase TEXT,
  sentence TEXT NOT NULL,
  order_index INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_entry_word_id ON dictionary_entry(word_id);
CREATE INDEX idx_meaning_entry_id ON dictionary_meaning(entry_id);
CREATE INDEX idx_example_meaning_id ON dictionary_example(meaning_id);

CREATE UNIQUE INDEX uniq_word_source
ON dictionary_word (word, source);


