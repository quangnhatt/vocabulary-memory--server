import { pgPool } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";

export async function importSystemVocabulary(userId, systemVocabId) {
  try {
    await pgPool.query("BEGIN");

    // Load system vocabulary
    const { rows } = await pgPool.query(
      `
      SELECT *
      FROM system_vocabularies
      WHERE id = $1
        AND deleted_at IS NULL
      `,
      [systemVocabId]
    );

    if (rows.length === 0) {
      throw new Error("System vocabulary not found");
    }

    const vocab = rows[0];

    // Prevent duplicate import (same term)
    const exists = await pgPool.query(
      `
      SELECT 1
      FROM words
      WHERE user_id = $1
        AND lower(term) = lower($2)
        AND is_deleted = false
        AND imported_source = "system"
      LIMIT 1
      `,
      [userId, vocab.term]
    );

    if (exists.rowCount > 0) {
      throw new Error("Word already exists in your vocabulary");
    }

    // Insert into words
    const now = new Date();

    await pgPool.query(
      `
      INSERT INTO words (
        id,
        user_id,
        term,
        translation,
        example,
        source_lang,
        target_lang,
        total_reviews,
        interval_days,
        is_deleted,
        created_at,
        updated_at,
        imported_source
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,
        0,1,false,$8,$8, "system"
      )
      `,
      [
        uuidv4(),
        userId,
        vocab.term,
        vocab.definition,
        vocab.example,
        vocab.source_lang,
        vocab.target_lang,
        now,
      ]
    );

    // Increase popularity
    await pgPool.query(
      `
      UPDATE system_vocabularies
      SET popular_score = popular_score + 1,
          updated_at = NOW()
      WHERE id = $1
      `,
      [systemVocabId]
    );

    await pgPool.query("COMMIT");
  } catch (e) {
    await pgPool.query("ROLLBACK");
    throw e;
  } finally {
    pgPool.release();
  }
}
