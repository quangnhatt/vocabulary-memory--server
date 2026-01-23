import { pgPool } from "../db/index.js";

class UseSettingsRepository {
  async getByUserId(userId) {
    const { rows } = await pgPool.query(
      `
          SELECT
            words_per_day,
            learning_speed,
            native_lang,
            learning_lang
          FROM user_settings
          WHERE user_id = $1
          `,
      [userId],
    );

    return rows[0] || null;
  }

  async upsert(
    userId,
    { wordsPerDay, learningSpeed, nativeLang, learningLang },
  ) {
    const { rows } = await pgPool.query(
      `
      INSERT INTO user_settings (user_id, words_per_day, learning_speed, native_lang, learning_lang)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id)
      DO UPDATE SET
        words_per_day = EXCLUDED.words_per_day,
        learning_speed = EXCLUDED.learning_speed,
        native_lang = EXCLUDED.native_lang,
        learning_lang = EXCLUDED.learning_lang
      RETURNING user_id, words_per_day, learning_speed, native_lang, learning_lang
      `,
      [userId, wordsPerDay, learningSpeed, nativeLang, learningLang],
    );

    return rows[0];
  }
}

export default new UseSettingsRepository();
