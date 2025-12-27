import { pgPool } from "../db/index.js";

class ReviewService {
  async saveReviewActions(userId, actions = []) {
    if (!actions.length) return;
    try {
      await pgPool.query("BEGIN");

      for (const a of actions) {
        await pgPool.query(
          `
        INSERT INTO review_actions (
          user_id,
          word_id,
          difficulty,
          reviewed_at,
          turn_id
        )
        VALUES ($1,$2,$3,$4,$5)
        `,
          [userId, a.word_id, a.difficulty, a.reviewed_at, a.turn_id]
        );
      }

      await pgPool.query("COMMIT");
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw e;
    } finally {
    }
  }

  async getReviewSummary(userId, range) {
    const interval = range === "30d" ? "30 days" : "7 days";

    const { rows } = await pgPool.query(
      `
    SELECT
      word_id,
      difficulty,
      to_char(reviewed_at, 'YYYY-MM-DD') AS day
    FROM review_actions
    WHERE user_id = $1
      AND reviewed_at >= NOW() - INTERVAL '${interval}'
    ORDER BY reviewed_at ASC
    `,
      [userId]
    );

    // day -> difficulty -> Set(word_id)
    const map = {};

    for (const r of rows) {
      if (!map[r.day]) {
        map[r.day] = {
          forget: new Set(),
          good: new Set(),
          easy: new Set(),
        };
      }

      map[r.day][r.difficulty].add(r.word_id);
    }

    const days = [];
    let totalReviewed = 0;

    for (const day of Object.keys(map).sort()) {
      const difficulties = {
        forget: map[day].forget.size,
        good: map[day].good.size,
        easy: map[day].easy.size,
      };

      const dayTotal =
        difficulties.forget + difficulties.good + difficulties.easy;

      totalReviewed += dayTotal;

      days.push({
        date: day,
        difficulties,
        total: dayTotal,
      });
    }

    return {
      days,
      summary: {
        total_reviewed: totalReviewed,
        active_days: days.length,
      },
    };
  }
}

export default new ReviewService();
