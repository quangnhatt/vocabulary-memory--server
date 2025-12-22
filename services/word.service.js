import { pgPool } from "../db/index.js";

class WordService {
  async getWordsByUser(userId) {
    const res = await pgPool.query(
      `
      SELECT *
      FROM words
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
      `,
      [userId]
    );

    return res.rows;
  }
}

export default new WordService();
