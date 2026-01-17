import UserSettingsService from "../services/user_settings.service.js";

class UserSettingsController {
  async getUserSettings(req, res) {
    const settings = await UserSettingsService.getByUserId(req.userId);
    res.json({
      success: true,
      user_id: settings.user_id,
      words_per_day: settings.words_per_day,
      learning_speed: settings.learning_speed,
      native_language_code: settings.native_lang,
      learning_language_code: settings.learning_lang,
    });
  }

  async updateUserSettings(req, res) {
    const userId = req.userId;
    const {
      words_per_day,
      learning_speed,
      native_language_code,
      learning_language_code,
    } = req.body.settings;
    const updated = await UserSettingsService.upsert(userId, {
      wordsPerDay: words_per_day,
      learningSpeed: learning_speed,
      nativeLang: native_language_code,
      learningLang: learning_language_code,
    });

    res.json({
      success: true,
      user_id: userId,
      words_per_day: updated.words_per_day,
      learning_speed: updated.learning_speed,
      native_language_code: updated.native_lang,
      learning_language_code: updated.learning_lang,
    });
  }
}

export default new UserSettingsController();
