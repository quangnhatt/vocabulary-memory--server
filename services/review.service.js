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
          previous_difficulty,
          difficulty,
          previous_state,
          state,
          reviewed_at,
          turn_id
        )
        VALUES ($1,$2,$3,$4,$5, $6, $7, $8)
        `,
          [
            userId,
            a.word_id,
            a.previous_difficulty,
            a.difficulty,
            a.previous_state,
            a.state,
            a.reviewed_at,
            a.turn_id,
          ],
        );
        console.log(a.review_at);
        console.log(Date.now());
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
      [userId],
    );

    let totalReviewed = 0;

    const resultDays = rows.map((r) => {
      const dayTotal = +r.forget + +r.good + +r.easy;
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

  async getTodayReviewActionStats(userId) {
    const query = `
    WITH latest_actions AS (
      SELECT DISTINCT ON (user_id, word_id)
        user_id,
        word_id,
        previous_difficulty,
        difficulty,
        previous_state,
        state,
        reviewed_at
      FROM review_actions
      WHERE reviewed_at >= CURRENT_DATE
        AND reviewed_at < CURRENT_DATE + INTERVAL '1 day'
        AND user_id = $1
      ORDER BY user_id, word_id, reviewed_at DESC
    )

    SELECT
      COUNT(*) AS total_words,
      COUNT(CASE
        WHEN (previous_difficulty = 'easy'
             AND difficulty <> 'easy') or (difficulty = 'forget')
        THEN 1
      END) AS forgotten,

      COUNT(CASE
        WHEN previous_difficulty IN ('forget', 'good')
             AND difficulty IN ('good', 'easy')
        THEN 1
      END) AS remembered,

      COUNT(CASE
        WHEN previous_difficulty = 'easy'
             AND difficulty = 'easy'
             AND previous_state = 'review'
             AND state = 'mastered'
        THEN 1
      END) AS mastered,

      COUNT(CASE
        WHEN previous_difficulty = 'easy'
             AND difficulty = 'easy'
             AND previous_state IN ('mastered', 'fluent')
             AND state = 'fluent'
        THEN 1
      END) AS fluent

    FROM latest_actions;
  `;

    const { rows } = await pgPool.query(query, [userId]);
    return rows[0];
  }
}

export default new ReviewService();
