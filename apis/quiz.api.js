import QuizController from "../controllers/quiz.controller.js";

export const load = (app) => {
  app.get("/api/v1/quiz/start", QuizController.startQuizHandler);
  app.post("/api/v1/quiz/submit", QuizController.submitQuizHandler);
};
