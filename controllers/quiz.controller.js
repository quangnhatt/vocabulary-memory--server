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
     const { userId } = req;
    const { quizRatio, difficultyPressure } = await QuizService.submitQuiz(
      userId,
      attemptId,
      answers
    );

    const {
      oldCS,
      newCS,
      oldLevel,
      currentLevel
    } = await ProgressService.updateUserProgress({
      userId: req.userId,
      quizRatio,
      difficultyPressure,
    });

    res.json({
      quizRatio,
      oldCS,
      newCS,
      oldLevel,
      currentLevel
    });
  }
}
export default new QuizController();
