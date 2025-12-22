import { pgPool } from "../db/index.js";

class SyncService {
  async syncWords({ userId, lastSyncAt, items = [] }) {
    try {
      await pgPool.query("BEGIN");
      // ─────────────────────────────────────────────
      // Apply client → server changes
      // ─────────────────────────────────────────────
      for (const word of items) {
        //   const {
        //     id,
        //     term,
        //     translation,
        //     example,
        //     tags, // can be null
        //     nextReviewAt,
        //     sourceLang,
        //     targetLang,
        //     totalReviews,
        //     intervalDays,
        //     updatedAt,
        //     isDeleted,
        //   } = word;

        //   const existing = await pgPool.query(
        //     `
        // SELECT updated_at
        // FROM words
        // WHERE id = $1 AND user_id = $2
        // `,
        //     [id, userId]
        //   );

        //   if (existing.rowCount === 0) {
        //     // ───────── INSERT ─────────
        //     await pgPool.query(
        //       `
        //   INSERT INTO words (
        //     id,
        //     user_id,
        //     term,
        //     translation,
        //     example,
        //     tags,
        //     next_review,
        //     source_lang,
        //     target_lang,
        //     total_reviews,
        //     interval_days,
        //     is_deleted,
        //     created_at,
        //     updated_at
        //   )
        //   VALUES (
        //     $1,$2,$3,$4,$5,
        //     $6,$7,$8,
        //     $9,$10,$11, $12,
        //     NOW(),$13
        //   )
        //   `,
        //       [
        //         id,
        //         userId,
        //         term,
        //         translation,
        //         example,
        //         tags ?? null, // ✅ nullable
        //         nextReviewAt,
        //         sourceLang ?? "en",
        //         targetLang ?? "vi",
        //         totalReviews ?? 0,
        //         intervalDays ?? 1,
        //         isDeleted ?? false,
        //         updatedAt,
        //       ]
        //     );
        //   } else {
        //     const serverUpdatedAt = existing.rows[0].updated_at;
        //     if (new Date(updatedAt) > serverUpdatedAt) {
        //       await pgPool.query(
        //         `
        //     UPDATE words
        //     SET
        //       term = $1,
        //       translation = $2,
        //       example = $3,
        //       tags = $4,
        //       next_review = $5,
        //       source_lang = $6,
        //       target_lang = $7,
        //       total_reviews = $8,
        //       interval_days = $9,
        //       is_deleted = $10,
        //       updated_at = $11
        //     WHERE id = $12 AND user_id = $13
        //     `,
        //         [
        //           term,
        //           translation,
        //           example,
        //           tags ?? null, // ✅ nullable
        //           nextReviewAt,
        //           sourceLang ?? "en",
        //           targetLang ?? "vi",
        //           totalReviews ?? 0,
        //           intervalDays ?? 1,
        //           isDeleted ?? false,
        //           updatedAt,
        //           id,
        //           userId,
        //         ]
        //       );
        //     }
        //   }
        await this.upsertWord(userId, word);
      }

      // Update tags
      const tags = this.extractTags(items);
      await this.upsertTags(userId, tags);
      await this.recalcTagUsage(userId);
      await this.cleanupUnusedTags(userId);

      // ─────────────────────────────────────────────
      // Fetch server → client changes
      // ─────────────────────────────────────────────
      const serverChanges = await pgPool.query(
        `
    SELECT
      id,
      term,
      translation,
      example,
      tags,
      next_review_at AS "nextReviewAt",
      source_lang AS "sourceLang",
      target_lang AS "targetLang",
      total_reviews AS "totalReviews",
      interval_days AS "intervalDays",
      updated_at AS "updatedAt"
    FROM words
    WHERE user_id = $1
      AND updated_at > $2
      AND is_deleted = false
    ORDER BY updated_at ASC
    `,
        [userId, lastSyncAt ?? new Date(0)]
      );

      await pgPool.query("COMMIT");
      return {
        serverTime: new Date().toISOString(),
        items: serverChanges.rows,
      };
    } catch (error) {
      await pgPool.query("ROLLBACK");
      console.error("Error in syncWords:", error);
      throw error;
    }
  }

  async upsertWord(userId, word) {
    const {
      id,
      term,
      translation,
      example,
      tags,
      nextReviewAt,
      sourceLang,
      targetLang,
      totalReviews,
      intervalDays,
      isDeleted,
      updatedAt,
    } = word;

    await pgPool.query(
      `
    INSERT INTO words (
      id, user_id, term, translation, example, tags,
      next_review_at, source_lang, target_lang,
      total_reviews, interval_days, is_deleted, updated_at
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,
      $10,$11,$12,$13
    )
    ON CONFLICT (id)
    DO UPDATE SET
      term = EXCLUDED.term,
      translation = EXCLUDED.translation,
      example = EXCLUDED.example,
      tags = EXCLUDED.tags,
      next_review_at = EXCLUDED.next_review_at,
      source_lang = EXCLUDED.source_lang,
      target_lang = EXCLUDED.target_lang,
      total_reviews = EXCLUDED.total_reviews,
      interval_days = EXCLUDED.interval_days,
      is_deleted = EXCLUDED.is_deleted,
      updated_at = EXCLUDED.updated_at
    `,
      [
        id,
        userId,
        term,
        translation,
        example,
        tags ?? null,
        nextReviewAt,
        sourceLang ?? "en",
        targetLang ?? "vi",
        totalReviews ?? 0,
        intervalDays ?? 1,
        isDeleted ?? false,
        updatedAt,
      ]
    );
  }

  extractTags(items) {
    const set = new Set();

    for (const word of items) {
      if (word.isDeleted) continue;
      if (!word.tags) continue;

      for (const tag of word.tags) {
        set.add(tag.trim().toLowerCase());
      }
    }

    return [...set];
  }

  async upsertTags(userId, tags) {
    for (const tag of tags) {
      await pgPool.query(
        `
      INSERT INTO tags (user_id, name)
      VALUES ($1, $2)
      ON CONFLICT (user_id, name) DO NOTHING
      `,
        [userId, tag]
      );
    }
  }

  async recalcTagUsage(userId) {
    await pgPool.query(
      `
    UPDATE tags t
    SET usage_count = sub.count,
        updated_at = NOW()
    FROM (
      SELECT unnest(tags) AS tag, COUNT(*) AS count
      FROM words
      WHERE user_id = $1
        AND is_deleted = false
        AND tags IS NOT NULL
      GROUP BY tag
    ) sub
    WHERE t.user_id = $1
      AND t.name = sub.tag
    `,
      [userId]
    );
  }

  async cleanupUnusedTags(userId) {
    await pgPool.query(
      `
    DELETE FROM tags
    WHERE user_id = $1
      AND usage_count = 0
    `,
      [userId]
    );
  }
}

export default new SyncService();
