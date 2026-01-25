CREATE TABLE learning_modes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  language TEXT NOT NULL,
  term TEXT NOT NULL,
  mode TEXT NOT NULL,
  question_type TEXT NOT NULL CHECK (
    question_type IN ('fill_the_gap', 'single_choice', 'free_input')
  ),
  prompt TEXT NOT NULL,
  answer TEXT,
  options TEXT[],
  correct_index INTEGER,
  suggested_answer TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  CHECK (
    (question_type = 'fill_the_gap'
      AND answer IS NOT NULL
      AND options IS NULL
      AND correct_index IS NULL
      AND suggested_answer IS NULL
    )
    OR
    (question_type = 'single_choice'
      AND options IS NOT NULL
      AND array_length(options, 1) > 1
      AND correct_index IS NOT NULL
      AND correct_index >= 0
      AND correct_index < array_length(options, 1)
      AND answer IS NULL
      AND suggested_answer IS NULL
    )
    OR
    (question_type = 'free_input'
      AND suggested_answer IS NOT NULL
      AND answer IS NULL
      AND options IS NULL
      AND correct_index IS NULL
    )
  )
);

-- Helpful indexes
CREATE INDEX idx_learning_modes_term ON learning_modes(term);
CREATE INDEX idx_learning_modes_mode ON learning_modes(mode);
CREATE INDEX idx_learning_modes_question_type ON learning_modes(question_type);