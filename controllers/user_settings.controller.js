import UserSettingsService from "../services/user_settings.service.js";

class UserSettingsController {
  async getUserSettings(req, res) {
    const settings = await UserSettingsService.getByUserId(req.userId);
    res.json({
      success: true,
      user_id: settings.user_id,
      words_per_day: settings.words_per_day,
    });
  }

  async updateUserSettings(req, res) {
    const userId = req.userId;
    const { words_per_day } = req.body.settings;
    const updated = await UserSettingsService.upsert(userId, {
      wordsPerDay: words_per_day,
    });

    res.json({
      success: true,
      user_id: userId,
      words_per_day: updated.words_per_day,
    });
  }
}

export default new UserSettingsController();
