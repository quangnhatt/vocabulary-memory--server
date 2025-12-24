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
      turn_id,
      reviewed_at::date AS day
    FROM review_actions
    WHERE user_id = $1
      AND reviewed_at >= NOW() - INTERVAL '${interval}'
    ORDER BY reviewed_at ASC
    `,
      [userId]
    );

    // group by day → turn
    const byDay = {};
    for (const r of rows) {
      if (!byDay[r.day]) byDay[r.day] = {};
      if (!byDay[r.day][r.turn_id]) byDay[r.day][r.turn_id] = new Set();

      byDay[r.day][r.turn_id].add(r.word_id);
    }

    const points = [];

    for (const day of Object.keys(byDay).sort()) {
      const turns = Object.values(byDay[day]).map((s) => s.size);

      let last = null;

      for (const count of turns) {
        if (count >= 20) {
          last = { date: day, words: count };
          points.push(last);
        } else {
          if (last) {
            last.words += count;
          } else {
            last = { date: day, words: count };
            points.push(last);
          }
        }
      }
    }

    return {
      points,
      summary: {
        total_reviewed: points.reduce((s, p) => s + p.words, 0),
        active_days: Object.keys(byDay).length,
      },
    };
  }
}

export default new ReviewService();
