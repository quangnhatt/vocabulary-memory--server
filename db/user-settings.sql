CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY,
  words_per_day INTEGER NOT NULL DEFAULT 20,
  learning_speed INTEGER NOT NULL DEFAULT 1,
  last_sync_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT words_per_day_range CHECK (words_per_day BETWEEN 1 AND 100)
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON user_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
