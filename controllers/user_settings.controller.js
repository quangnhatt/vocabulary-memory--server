import UserSettingsService from "../services/user_settings.service.js";

class UserSettingsController {
  async getUserSettings(req, res) {
    const settings = await UserSettingsService.getByUserId(req.userId);
    res.json({
      success: true,
      user_id: settings.user_id,
      words_per_day: settings.words_per_day,
      learning_speed: settings.learning_speed,
    });
  }

  async updateUserSettings(req, res) {
    const userId = req.userId;
    const { words_per_day, learning_speed } = req.body.settings;
    const updated = await UserSettingsService.upsert(userId, {
      wordsPerDay: words_per_day,
      learningSpeed: learning_speed,
    });

    res.json({
      success: true,
      user_id: userId,
      words_per_day: updated.words_per_day,
      learning_speed: updated.learning_speed,
    });
  }
}

export default new UserSettingsController();
