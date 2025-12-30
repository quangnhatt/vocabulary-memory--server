import { pgPool } from "../db/index.js";
import {
  USER_LEVELS,
  resolveLevel,
  pointsToNextLevel,
  progressPercent,
  nextLevel,
} from "../utils/progress.js";

class ProfileService {
  async getMyProfile(userId) {
    if (!userId) {
      throw new Error("userId is required");
    }

    const { rows } = await pgPool.query(
      `
    SELECT
      id,
      username,
      avatar_url,
      confidence_score,
      current_level,
      total_quizzes,
      accuracy,
      current_streak
    FROM users
    WHERE id = $1
    `,
      [userId]
    );

    if (!rows.length) {
      return null;
    }

    const user = rows[0];
    const cs = Number(user.confidence_score ?? 0);

    const level = resolveLevel(cs);

    // 2. Build response
    return {
      id: user.id,
      username: user.username,
      avatarUrl: user.avatar_url,
      level,
      confidenceScore: cs,
      progressPercent: Number(progressPercent(cs).toFixed(1)),
      pointsToNextLevel: pointsToNextLevel(cs),
      nextLevel: nextLevel(level),
      lastLevel: USER_LEVELS.at(-1),
      stats: {
        totalQuizzes: +(user.total_quizzes) ?? 0,
        accuracy: +(user.accuracy) ?? 0,
        currentStreak: +(user.current_streak) ?? 0,
      },
    };
  }
}

export default new ProfileService();
