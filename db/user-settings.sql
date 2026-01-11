CREATE TABLE user_settings (
  user_id UUID PRIMARY KEY,
  words_per_day INTEGER NOT NULL DEFAULT 20,
  learning_speed INTEGER NOT NULL DEFAULT 1,

  notification_enabled BOOLEAN DEFAULT true,
  notification_threshold INT DEFAULT 10,
  cooldown_hours INT DEFAULT 12,
  last_notification_sent_at TIMESTAMP,
  timezone TEXT DEFAULT 'UTC',
  preferred_notification_time TIME,
   source_lang VARCHAR(10),
  target_lang VARCHAR(10),

  last_sync_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT words_per_day_range CHECK (words_per_day BETWEEN 1 AND 100)
);

CREATE TABLE device_tokens (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  token TEXT NOT NULL,
  platform TEXT CHECK (platform IN ('ios', 'android', 'web')),
  created_at TIMESTAMP DEFAULT now()
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
