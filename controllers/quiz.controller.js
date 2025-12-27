import QuizService from "../services/quiz.service.js";
import ProgressService from "../services/progress.service.js";

class QuizController {
  async startQuizHandler(req, res) {
    const { userId } = req;
    const result = await QuizService.startQuiz(userId);
    res.json(result);
  }

  async submitQuizHandler(req, res) {
    const { attemptId, answers } = req.body;
    const { quizRatio, difficultyPressure } = await QuizService.submitQuiz(
      attemptId,
      answers
    );

    const newCS = await ProgressService.updateProgress(
      req.userId,
      quizRatio,
      difficultyPressure
    );

    res.json({
      quizRatio,
      confidenceScore: newCS,
    });
  }
}
export default new QuizController();