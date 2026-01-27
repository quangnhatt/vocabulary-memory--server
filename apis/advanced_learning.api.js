import AdvancedLearningController from "../controllers/advanced_learning.controller.js";

export const load = (app) => {
  app.get("/api/v1/advanced-learning", AdvancedLearningController.getAdvancedLearningByTerm);
  app.post("/api/v1/advanced-learning", AdvancedLearningController.ingestLearningModes);
};
