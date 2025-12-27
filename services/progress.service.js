import { pgPool } from "../db/index.js";
import { calculateDeltaCS } from "../utils/quiz.scoring.js";

function resolveLevel(cs) {
  if (cs < 100) return "explorer";
  if (cs < 300) return "builder";
  if (cs < 500) return "confident";
  if (cs < 700) return "fluent";
  if (cs < 900) return "near_native";
  return "native_like";
}

class ProgressService {
  async updateUserProgress({ userId, quizRatio, difficultyPressure }) {
    const { rows } = await pgPool.query(
      `SELECT confidence_score FROM users WHERE id = $1`,
      [userId]
    );

    const currentCS = rows[0].confidence_score;

    const delta = calculateDeltaCS({
      quizRatio,
      difficultyPressure,
      currentCS,
    });

    const newCS = Math.min(Math.max(currentCS + delta, 0), 1000);
    const newLevel = resolveLevel(newCS);

    await pgPool.query(
      `
    UPDATE users
    SET confidence_score = $1,
        current_level = $2,
        total_quizzes = total_quizzes + 1,
        last_quiz_at = NOW(),
        updated_at = NOW()
    WHERE id = $3
  `,
      [newCS, newLevel, userId]
    );

    return {
      confidenceScore: newCS,
      level: newLevel,
    };
  }
}

export default new ProgressService();