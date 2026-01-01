import { pgPool } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";

class SyncService {
  async syncWords({ userId, lastSyncAt, items = [] }) {
    try {
      await pgPool.query("BEGIN");
      // Apply client → server changes
      // ─────────────────────────────────────────────
      for (const word of items) {
        await this.upsertWord(userId, word);
      }

      // Update tags
      const tags = this.extractTags(items);
      await this.upsertTags(userId, tags);
      await this.recalcTagUsage(userId);
      await this.cleanupUnusedTags(userId);
      const userSettings = await this.updateLastSyncAt(userId, new Date());

      // Fetch server → client changes
      // ─────────────────────────────────────────────
      // Force update or not
      const { rows } = await pgPool.query(
        `
        SELECT forced_to_reload_vocabulary 
        FROM users 
        WHERE id = $1`,
        [userId]
      );

      const forcedToReload = rows[0]?.forced_to_reload_vocabulary;
      const syncCondition = forcedToReload ? "" : " AND updated_at > $2";
      const serverChanges = await pgPool.query(
        `
    SELECT
      id,
      term,
      translation,
      example,
      tags,
      state,
      last_result,
      easy_streak,
      next_review_at,
      source_lang,
      target_lang,
      total_reviews,
      updated_at,
      user_id
    FROM words
    WHERE user_id = $1
      ${syncCondition}
      AND is_deleted = false
    ORDER BY updated_at ASC
    `,
        forcedToReload ? [userId] : [userId, lastSyncAt ?? new Date(0)]
      );

      await pgPool.query("COMMIT");
      return {
        serverTime: new Date().toISOString(),
        items: serverChanges.rows,
        forcedToReload: forcedToReload,
        lastSyncAt: userSettings.last_sync_at,
      };
    } catch (error) {
      await pgPool.query("ROLLBACK");
      console.error("Error in syncWords:", error);
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
      isDeleted,
      updatedAt,
    } = word;

    await pgPool.query(
      `
    INSERT INTO words (
      id, user_id, term, translation, example, tags,
      next_review_at, source_lang, target_lang,
      total_reviews, is_deleted, updated_at,
      state, last_result, easy_streak,
      last_reviewed_at
    )
    VALUES (
      $1,$2,$3,$4,$5,$6,
      $7,$8,$9,
      $10,$11,$12,$13, $14,$15, $16
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
      is_deleted = EXCLUDED.is_deleted,
      updated_at = EXCLUDED.updated_at,
      state = EXCLUDED.state,
      last_result = EXCLUDED.last_result,
      easy_streak = EXCLUDED.easy_streak,
      last_reviewed_at = EXCLUDED.last_reviewed_at
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
        isDeleted ?? false,
        updatedAt ?? new Date(),
        word.state ?? "new",
        word.lastResult ?? null,
        word.easyStreak ?? 0,
        word.lastReviewedAt ?? null,
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

  normalizeTags(tags) {
    if (!tags || !Array.isArray(tags)) return [];
    const normalized = tags
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0);
    return normalized.length > 0 ? normalized : [];
  }

  /**
   * Save ONE word using user_code
   */
  async saveWordByUserCode(payload) {
    const {
      user_code,
      term,
      translation,
      example,
      tags,
      source_lang = "en",
      target_lang = "vi",
    } = payload;

    if (!user_code || !term || !translation) {
      throw new Error("Missing required fields");
    }

    try {
      await pgPool.query("BEGIN");

      // Resolve user
      const userRes = await pgPool.query(
        `SELECT id FROM users WHERE user_code = $1`,
        [user_code]
      );

      if (userRes.rowCount === 0) {
        throw new Error("Invalid user code");
      }

      const userId = userRes.rows[0].id;
      const existingRes = await pgPool.query(
        `
            SELECT *
            FROM words
            WHERE user_id = $1
              AND lower(term) = lower($2)
              AND is_deleted = false
            LIMIT 1
            `,
        [userId, term]
      );

      if (existingRes.rowCount > 0) {
        // Optional: update updated_at (touch)
        await pgPool.query(
          `
        UPDATE words
        SET 
          updated_at = NOW(),
          translation = $2,
          example = $3,
          tags = $4,
          source_lang = $5,
          target_lang = $6
        WHERE id = $1
        `,
          [
            existingRes.rows[0].id,
            translation,
            example ?? null,
            this.normalizeTags(tags),
            source_lang,
            target_lang,
          ]
        );

        await pgPool.query("COMMIT");

        return {
          id: existingRes.rows[0].id,
          term: existingRes.rows[0].term,
          translation: existingRes.rows[0].translation,
          existed: true,
        };
      }

      // Insert word
      const wordId = uuidv4();
      const now = new Date();
      const nextReviewAt = new Date(Date.now() + 60 * 60 * 1000);

      await pgPool.query(
        `
      INSERT INTO words (
        id,
        user_id,
        term,
        translation,
        example,
        tags,
        source_lang,
        target_lang,
        total_reviews,
        state,
        last_result,
        easy_streak,
        last_reviewed_at,
        next_review_at,
        is_deleted,
        created_at,
        updated_at
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,
        $7,$8,0,1,$9,$10,$11,$12,
        $13,false,$14,$15
      )
      `,
        [
          wordId,
          userId,
          term,
          translation,
          example ?? null,
          this.normalizeTags(tags),
          source_lang,
          target_lang,
          "new",
          null,
          0,
          null,
          nextReviewAt,
          now,
          now,
        ]
      );

      // Update tags table
      await this.upsertTags(userId, this.normalizeTags(tags));
      await this.recalcTagUsage(userId);

      await pgPool.query("COMMIT");

      return { id: wordId, term, translation };
    } catch (e) {
      await pgPool.query("ROLLBACK");
      throw e;
    } finally {
      // pgPool.release();
    }
  }

  async updateLastSyncAt(userId, lastSyncAt) {
    const { rows } = await pgPool.query(
      `
      UPDATE user_settings 
      SET last_sync_at = $1
      WHERE user_id = $2
      RETURNING user_id, last_sync_at
      `,
      [lastSyncAt, userId]
    );

    return rows[0];
  }
}
export default new SyncService();
