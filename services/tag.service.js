import { pgPool } from "../db/postgres.js";

class TagService {
  // existing method
  async getOrCreateTag(client, userId, name) {
    const res = await client.query(
      `
      INSERT INTO tags (user_id, name, usage_count)
      VALUES ($1, $2, 1)
      ON CONFLICT (user_id, name)
      DO UPDATE SET usage_count = tags.usage_count + 1
      RETURNING id
      `,
      [userId, name.toLowerCase()]
    );

    return res.rows[0].id;
  }

  // 🔥 NEW: tag suggestion
  async suggestTags(userId, query = "", limit = 10) {
    const res = await pgPool.query(
      `
      SELECT name
      FROM tags
      WHERE user_id = $1
        AND name ILIKE $2
      ORDER BY usage_count DESC, name ASC
      LIMIT $3
      `,
      [userId, `%${query}%`, limit]
    );

    return res.rows.map((r) => r.name);
  }
}

export default new TagService();
