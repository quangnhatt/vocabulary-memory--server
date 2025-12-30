import ProfileController from "../controllers/profile.controller.js";

export const load = (app) => {
  app.get("/api/v1/me", ProfileController.getMyProfile);
};
