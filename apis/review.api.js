import ReviewController from "../controllers/review.controller.js";

export const load = (app) => {
  app.post("/api/v1/reviews/actions", ReviewController.saveReviewActions);
  app.get("/api/v1/reviews/summary", ReviewController.getReviewSummary);
};
