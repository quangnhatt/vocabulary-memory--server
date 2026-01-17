import { pgPool } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";
import CONSTANTS from "../common/constants.js";
class SystemCategoryService {
  async importCategories(userId, categoryId) {
    try {
      await pgPool.query("BEGIN");
      // Check if already imported
      const { rows: existed } = await pgPool.query(
        `
        SELECT 1
        FROM user_activities
        WHERE user_id = $1
          AND system_category_id = $2
          AND activity_type = 'import_category'
        LIMIT 1
        `,
        [userId, categoryId]
      );
      if (existed.length > 0) {
        await pgPool.query("ROLLBACK");
        return { success: false, imported: 0, message: "Category already imported" };
      }

      // Load vocabularies in selected categories
      const { rows: vocabularies } = await pgPool.query(
        `
       SELECT
          v.*,
          c.name AS category_name,
          c.tags
        FROM system_vocabularies v
        JOIN system_categories c ON v.category_id = c.id
        WHERE v.category_id = $1
          AND v.deleted_at IS NULL
          AND c.deleted_at IS NULL
        `,
        [categoryId]
      );

      if (vocabularies.length === 0) {
        await pgPool.query("ROLLBACK");
        return { success: false, imported: 0, message: "No vocabularies found in category" };
      }

      let importedCount = 0;

      for (const vocab of vocabularies) {
        // Insert into words
        await pgPool.query(
          `
        INSERT INTO words (
          id, user_id, term, ipa, translation, example, tags, source_lang, target_lang,
          state, imported_source,
          total_reviews
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,
          'new', 'system',
          0
        )
        `,
          [
            uuidv4(),
            userId,
            vocab.term,
            vocab.ipa,
            vocab.target_translation,
            vocab.example,
            vocab.tags,
            vocab.source_lang,
            vocab.target_lang,
          ]
        );

        importedCount++;
      }

      // Log user activity (IMPORT ONCE GUARANTEE)
      await pgPool.query(
        `
        INSERT INTO user_activities (
          idd,
          user_id,
          activity_type,
          system_category_id,
          details
        )
        VALUES ($1, $2, $3, $4, $5)
        `,
        [
          uuidv4(),
          userId,
          CONSTANTS.ACTIVITY_TYPES.IMPORT_CATEGORY,
          categoryId,
          {
            imported_words: importedCount,
          },
        ]
      );

      // Increase popularity
      await pgPool.query(
        `
      UPDATE system_categories
      SET usage_count = usage_count + 1,
          updated_at = NOW()
      WHERE id = $1
      `,
        [categoryId]
      );

      await pgPool.query("COMMIT");

      return { success: true, imported: importedCount };
    } catch (e) {
      await pgPool.query("ROLLBACK");
      return { success: false, imported: 0, message: e.message };
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

    const result = rows
      .map((c) => ({
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
      }))
      .filter((x) => x.vocabularies.length > 0);

    return result;
  }
}

export default new SystemCategoryService();
