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
    const days = range === "30d" ? 30 : 7;

    const { rows } = await pgPool.query(
      `
    WITH date_range AS (
      SELECT
        generate_series(
          CURRENT_DATE - INTERVAL '${days - 1} days',
          CURRENT_DATE,
          INTERVAL '1 day'
        )::date AS day
    ),
    reviews AS (
      SELECT
        DATE(reviewed_at) AS day,
        difficulty,
        COUNT(DISTINCT word_id) AS count
      FROM review_actions
      WHERE user_id = $1
        AND reviewed_at >= CURRENT_DATE - INTERVAL '${days - 1} days'
      GROUP BY DATE(reviewed_at), difficulty
    )
    SELECT
      to_char(d.day, 'YYYY-MM-DD') AS day,
      COALESCE(SUM(CASE WHEN r.difficulty = 'forget' THEN r.count END), 0) AS forget,
      COALESCE(SUM(CASE WHEN r.difficulty = 'good' THEN r.count END), 0) AS good,
      COALESCE(SUM(CASE WHEN r.difficulty = 'easy' THEN r.count END), 0) AS easy
    FROM date_range d
    LEFT JOIN reviews r ON r.day = d.day
    GROUP BY d.day
    ORDER BY d.day ASC
    `,
      [userId]
    );

    let totalReviewed = 0;

    const resultDays = rows.map((r) => {
      const dayTotal = +(r.forget) + +(r.good) + +(r.easy);
      totalReviewed += dayTotal;

      return {
        date: r.day,
        difficulties: {
          forget: Number(r.forget),
          good: Number(r.good),
          easy: Number(r.easy),
        },
        total: dayTotal,
      };
    });

    return {
      days: resultDays,
      summary: {
        total_reviewed: totalReviewed,
        active_days: resultDays.filter((d) => d.total > 0).length,
      },
    };
  }
}

export default new ReviewService();
