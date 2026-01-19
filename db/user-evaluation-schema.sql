CREATE TABLE quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prompt TEXT NOT NULL,
  default_popularity TEXT,
  popularity_score NUMERIC(3,2)
    CHECK (popularity_score BETWEEN 0.2 AND 1.0)
    NOT NULL,
    categories TEXT[], -- new
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'review', 'disabled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE quiz_answers (
  id SERIAL PRIMARY KEY,
  question_id UUID NOT NULL
    REFERENCES quiz_questions(id)
    ON DELETE CASCADE,
  option_text TEXT NOT NULL,
  answer_type TEXT NOT NULL
    CHECK (answer_type IN ('best', 'acceptable', 'ok', 'wrong')),
  answer_point INTEGER, --new
    CHECK (answer_point BETWEEN 0 AND 10),
  explanation TEXT,
  status TEXT DEFAULT 'active'
    CHECK (status IN ('active', 'review', 'disabled')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);


CREATE TABLE quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  level_at_start TEXT NOT NULL,
  total_possible_points INTEGER NOT NULL DEFAULT 0, --new
  total_earned_points INTEGER,
  quiz_ratio NUMERIC(4,3)
    CHECK (quiz_ratio BETWEEN 0 AND 1),
  difficulty_pressure NUMERIC(4,3),
  delta_cs NUMERIC(6,3),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_attempt_questions (
  id SERIAL PRIMARY KEY,
  attempt_id UUID NOT NULL
    REFERENCES quiz_attempts(id)
    ON DELETE CASCADE,
  question_id UUID NOT NULL,
  prompt TEXT NOT NULL,
  popularity_score NUMERIC(3,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_attempt_answers (
  id SERIAL PRIMARY KEY,
  attempt_question_id INTEGER NOT NULL
    REFERENCES quiz_attempt_questions(id)
    ON DELETE CASCADE,
  answer_id INTEGER NOT NULL
    REFERENCES quiz_answers(id), --new
  answer_text TEXT NOT NULL, --selected_option_key TEXT NOT NULL,
  earned_point INTEGER, --new
  -- answer_weight NUMERIC(3,2)
  --   CHECK (answer_weight BETWEEN 0 AND 1),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE quiz_question_reports (
  id SERIAL PRIMARY KEY,
  question_id UUID NOT NULL
    REFERENCES quiz_questions(id)
    ON DELETE CASCADE,
  user_id UUID NOT NULL,
  report_type TEXT NOT NULL
    CHECK (report_type IN (
      'missing_answer',
      'unclear_context',
      'unnatural_wording',
      'ambiguous'
    )),
  comment TEXT,
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending', 'reviewed', 'resolved')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';