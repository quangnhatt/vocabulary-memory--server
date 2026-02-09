import { pgPool } from "../db/index.js";

class TagRepository {
  async upsertTags(userId, tags) {
    try {
      await pgPool.query("BEGIN");
      for (const tag of tags) {
        await pgPool.query(
          `
      INSERT INTO tags (user_id, name)
      VALUES ($1, $2)
      ON CONFLICT (user_id, name) DO NOTHING
      RETURNING id, name, shared_code, enabled_shared_code;
      `,
          [userId, tag],
        );
      }
      await pgPool.query("COMMIT");
      return true;
    } catch (ex) {
      await pgPool.query("ROLLBACK");
      return false;
    }
  }

  async recalcTagUsage(userId) {
    await pgPool.query(
      `
    UPDATE tags t
    SET usage_count = sub.count,
        updated_at = NOW()
    FROM (
      SELECT unnest(tags) AS tag, COUNT(*) AS count
      FROM words
      WHERE user_id = $1
        AND is_deleted = false
        AND tags IS NOT NULL
      GROUP BY tag
    ) sub
    WHERE t.user_id = $1
      AND t.name = sub.tag
    `,
      [userId],
    );
  }

  async cleanupUnusedTags(userId) {
    await pgPool.query(
      `
    DELETE FROM tags
    WHERE user_id = $1
      AND usage_count = 0
    `,
      [userId],
    );
  }
}

export default new TagRepository();
