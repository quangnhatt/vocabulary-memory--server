import { pgPool } from "../db/index.js";
import { calculateDeltaCS } from "../utils/quiz.scoring.js";
import {
  resolveLevel, leveragedDelta
} from "../utils/progress.js";

class ProgressService {
  async updateUserProgress({ userId, quizRatio, difficultyPressure }) {
    const { rows } = await pgPool.query(
      `SELECT confidence_score, current_level FROM users WHERE id = $1`,
      [userId]
    );

    const currentCS = +(rows[0].confidence_score);
    const currentLevel = rows[0].current_level;

    let delta = calculateDeltaCS({
      quizRatio,
      difficultyPressure,
      currentCS,
    });

    delta = leveragedDelta(currentCS, delta);

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
      [+newCS.toFixed(2), newLevel, userId]
    );

    console.log(`OLD ${currentCS} -> NEW ${newCS} | DELTA: ${delta}`);

    return {
      oldCS: currentCS,
      newCS: newCS,
      oldLevel: currentLevel,
      currentLevel: newLevel,
    };
  }
}

export default new ProgressService();