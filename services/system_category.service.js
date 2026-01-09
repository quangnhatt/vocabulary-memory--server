import { pgPool } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";
class SystemCategoryService {
  async importCategories(userId, categoryIds) {
    try {
      await pgPool.query("BEGIN");

      // 1️⃣ Load vocabularies in selected categories
      const { rows: vocabularies } = await pgPool.query(
        `
       SELECT
    v.*,
    c.name AS category_name
  FROM system_vocabularies v
  JOIN system_categories c ON v.category_id = c.id
  WHERE v.category_id = ANY($1)
    AND v.deleted_at IS NULL
    AND c.deleted_at IS NULL
  `,
        [categoryIds]
      );

      if (vocabularies.length === 0) {
        await pgPool.query("COMMIT");
        return { imported: 0 };
      }

      let importedCount = 0;
      const now = new Date();
      const nextReviewAt = new Date(Date.now() + 60 * 60 * 1000);

      for (const vocab of vocabularies) {
        // Skip existing user words
        const exists = await pgPool.query(
          `
        SELECT 1
        FROM words
        WHERE user_id = $1
          AND lower(term) = lower($2)
          AND is_deleted = false
        LIMIT 1
        `,
          [userId, vocab.term]
        );

        if (exists.rowCount > 0) continue;

        // Insert into words
        await pgPool.query(
          `
        INSERT INTO words (
          id,
          user_id,
          term,
          translation,
          example,
          tags,
          source_lang,
          target_lang,
          imported_source,
          total_reviews,
          interval_days,
          next_review_at,
          is_deleted,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,
          'system',
          0,1,
          $9,
          false,$10,$11
        )
        `,
          [
            uuidv4(),
            userId,
            vocab.term,
            vocab.translation,
            vocab.example,
            [vocab.category_name],
            vocab.source_lang,
            vocab.target_lang,
            nextReviewAt,
            now,
            now,
          ]
        );

        importedCount++;
      }

      // Increase popularity
      await pgPool.query(
        `
      UPDATE system_vocabularies
      SET popular_score = popular_score + 1,
          updated_at = NOW()
      WHERE category_id = ANY($1)
      `,
        [categoryIds]
      );

      await pgPool.query("COMMIT");

      return { imported: importedCount };
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw e;
    } finally {
    }
  }

  async getSystemCategories() {
    const { rows } = await pgPool.query(
      `
    SELECT
      c.id,
      c.name,
      c.source_lang,
      c.target_lang,
      c.description,
      COUNT(DISTINCT v.id) AS total_vocabularies,
      json_agg(
        json_build_object(
          'word', v.term,
          'meaning', v.target_translation 
        )
      ) FILTER (WHERE v.id IS NOT NULL) AS vocabularies
    FROM system_categories c
    LEFT JOIN system_vocabularies v
      ON c.id = v.category_id
    GROUP BY c.id;

    `
    );

    const result = rows.map((c) => ({
      id: c.id,
      name: c.name,
      source_lang: c.source_lang,
      target_lang: c.target_lang,
      description: c.description,
      total_vocabularies: Number(c.total_vocabularies),
      vocabularies: (c.vocabularies || []).slice(0, 10).map((v) => ({
        word: v.word,
        meaning: v.meaning,
      })),
    })).filter(x => x.vocabularies.length > 0);

    return result;
  }
}

export default new SystemCategoryService();
