import { pgPool } from "../db/index.js";

class SyncService {
  async syncWords({ userId, lastSyncAt, items = [] }) {
    try {
      // ─────────────────────────────────────────────
      // 1️⃣ Apply client → server changes
      // ─────────────────────────────────────────────
      for (const word of items) {
        const {
          id,
          term,
          translation,
          example,
          tags, // can be null
          nextReviewAt,
          sourceLang,
          targetLang,
          totalReviews,
          intervalDays,
          updatedAt,
          isDeleted,
        } = word;

        const existing = await pgPool.query(
          `
      SELECT updated_at
      FROM words
      WHERE id = $1 AND user_id = $2
      `,
          [id, userId]
        );

        if (existing.rowCount === 0) {
          // ───────── INSERT ─────────
          await pgPool.query(
            `
        INSERT INTO words (
          id,
          user_id,
          term,
          translation,
          example,
          tags,
          next_review,
          source_lang,
          target_lang,
          total_reviews,
          interval_days,
          is_deleted,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,
          $9,$10,$11, $12,
          NOW(),$13
        )
        `,
            [
              id,
              userId,
              term,
              translation,
              example,
              tags ?? null, // ✅ nullable
              nextReviewAt,
              sourceLang ?? "en",
              targetLang ?? "vi",
              totalReviews ?? 0,
              intervalDays ?? 1,
              isDeleted ?? false,
              updatedAt,
            ]
          );
        } else {
          const serverUpdatedAt = existing.rows[0].updated_at;
          if (new Date(updatedAt) > serverUpdatedAt) {
            await pgPool.query(
              `
          UPDATE words
          SET
            term = $1,
            translation = $2,
            example = $3,
            tags = $4,
            next_review = $5,
            source_lang = $6,
            target_lang = $7,
            total_reviews = $8,
            interval_days = $9,
            is_deleted = $10,
            updated_at = $11
          WHERE id = $12 AND user_id = $13
          `,
              [
                term,
                translation,
                example,
                tags ?? null, // ✅ nullable
                nextReviewAt,
                sourceLang ?? "en",
                targetLang ?? "vi",
                totalReviews ?? 0,
                intervalDays ?? 1,
                isDeleted ?? false,
                updatedAt,
                id,
                userId,
              ]
            );
          }
        }
      }

      // ─────────────────────────────────────────────
      // 2️⃣ Fetch server → client changes
      // ─────────────────────────────────────────────
      const serverChanges = await pgPool.query(
        `
    SELECT
      id,
      term,
      translation,
      example,
      tags,
      next_review AS "nextReviewAt",
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

      return {
        serverTime: new Date().toISOString(),
        items: serverChanges.rows,
      };
    } catch (error) {
      console.error("Error in syncWords:", error);
      throw error;
    }
  }
}

export default new SyncService();
