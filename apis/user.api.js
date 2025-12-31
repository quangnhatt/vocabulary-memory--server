import UserSettingsController from "../controllers/user_settings.controller.js";

export const load = (app) => {
  app.get("/api/v1/user/settings", UserSettingsController.getUserSettings);
  app.post("/api/v1/user/settings", UserSettingsController.updateUserSettings);
};
