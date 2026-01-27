import { pgPool } from "../db/index.js";

class LearningModeRepository {
  async upsertLearningMode(data) {
    const {
      id,
      source_language,
      term,
      mode,
      question_type,
      prompt,
      answer = null,
      options = null,
      correct_index = null,
      suggested_answer = null,
      status,
    } = data;

    try {
      const query = `
      INSERT INTO learning_modes (
        id,
        language,
        term,
        mode,
        question_type,
        prompt,
        answer,
        options,
        correct_index,
        suggested_answer,
        status
      )
      VALUES (
        COALESCE($1, gen_random_uuid()),
        $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
      )
      ON CONFLICT (id)
      DO UPDATE SET
        language = EXCLUDED.language,
        term = EXCLUDED.term,
        mode = EXCLUDED.mode,
        question_type = EXCLUDED.question_type,
        prompt = EXCLUDED.prompt,
        answer = EXCLUDED.answer,
        options = EXCLUDED.options,
        correct_index = EXCLUDED.correct_index,
        suggested_answer = EXCLUDED.suggested_answer,
        created_at = now(),
        status = EXCLUDED.status
      RETURNING *;
    `;

      const values = [
        id,
        source_language,
        term,
        mode,
        question_type,
        prompt,
        answer,
        options,
        correct_index,
        suggested_answer,
        status,
      ];

      const { rows } = await pgPool.query(query, values);
      await pgPool.query("COMMIT");
      return rows[0];
    } catch (err) {
      await pgPool.query("ROLLBACK");
      console.error("finishBattle error:", err);
      throw err;
    }
  }

  async getLearningModesByTerm(term, source_language) {
    const query = `
    SELECT
      id,
      language,
      mode,
      question_type,
      prompt,
      answer,
      options,
      correct_index,
      suggested_answer,
      created_at,
      status
    FROM learning_modes
    WHERE lower(term) = lower($1) and language = $2 
    ORDER BY created_at ASC;
  `;

    const { rows } = await pgPool.query(query, [term, source_language]);
    await pgPool.query("COMMIT");
    const questions = rows.map((row) => ({
      id: row.id,
      mode: row.mode,
      language: row.language,
      question_type: row.question_type,
      term: term,
      prompt: row.prompt,
      answer: row.answer,
      options: row.options,
      correct_index: row.correct_index,
      suggested_answer: row.suggested_answer,
      status: row.status
    }));
    return questions;
  }
}

export default new LearningModeRepository();
