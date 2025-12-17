import TagController from "../controllers/tag.controller.js";

export const load = (app) => {
  app.get("/api/v1/tags/suggest", TagController.suggest);
};
