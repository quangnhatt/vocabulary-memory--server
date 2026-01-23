import { pgPool } from "../db/index.js";
import { DEFAULT_USER_SETTINGS } from "../common/constants.js";
import UserSettingRepository from "../repositories/user_settings.repo.js";

class UserSettingsService {
  async getByUserId(userId) {
    const userSettings = await UserSettingRepository.getByUserId(userId);
    if (userSettings == null) {
      await this.upsert(userId, {
        wordsPerDay: DEFAULT_USER_SETTINGS.words_per_day,
        learningSpeed: DEFAULT_USER_SETTINGS.learning_speed,
        nativeLang: DEFAULT_USER_SETTINGS.native_lang,
        learningLang: DEFAULT_USER_SETTINGS.learning_lang,
      });
    }
    return userSettings || DEFAULT_USER_SETTINGS;
  }

  async upsert(
    userId,
    { wordsPerDay, learningSpeed, nativeLang, learningLang },
  ) {
    return await UserSettingRepository.upsert(userId, {
      wordsPerDay,
      learningSpeed,
      nativeLang,
      learningLang,
    });
  }

  async updateLastSyncAt(userId, { lastSyncAt }) {
    const { rows } = await pgPool.query(
      `
      UPDATE user_settings 
      SET last_sync_at = $1
      WHERE user_id = $2
      RETURNING user_id
      `,
      [lastSyncAt, userId],
    );

    return rows[0];
  }
}

export default new UserSettingsService();
