CREATE TABLE learning_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL,
  term TEXT NOT NULL,
  mode TEXT,
  question_type TEXT,
  prompt TEXT,
  answer TEXT,
  options TEXT[],
  correct_index INTEGER,
  suggested_answer TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  is_deleted BOOLEAN,
  deleted_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'active' CHECK (
    status IN ('pending', 'active')
  )
);

-- Helpful indexes
CREATE INDEX idx_learning_modes_term ON learning_modes(term);
CREATE INDEX idx_learning_modes_mode ON learning_modes(mode);
CREATE INDEX idx_learning_modes_question_type ON learning_modes(question_type);


ALTER TABLE learning_modes ALTER COLUMN mode DROP NOT NULL;
ALTER TABLE learning_modes ALTER COLUMN question_type DROP NOT NULL;
ALTER TABLE learning_modes ALTER COLUMN prompt DROP NOT NULL;

ALTER TABLE learning_modes DROP CONSTRAINT learning_modes_check;
