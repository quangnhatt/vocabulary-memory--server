import { pgPool } from "../db/index.js";
import TagService from "./tag.service.js";

class SyncService {
  async syncWords({ userId, lastSyncAt, changes }) {
    const client = await pgPool.connect();

    try {
      await client.query("BEGIN");

      // 1️⃣ APPLY UPSERT WORDS + TAGS
      for (const w of changes.upserts || []) {
        // --- upsert word ---
        await client.query(
          `
          INSERT INTO words (
            id, user_id, text, translation, example,
            source_lang, target_lang, updated_at
          )
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          ON CONFLICT (id)
          DO UPDATE SET
            text = EXCLUDED.text,
            translation = EXCLUDED.translation,
            example = EXCLUDED.example,
            source_lang = EXCLUDED.source_lang,
            target_lang = EXCLUDED.target_lang,
            updated_at = EXCLUDED.updated_at
          WHERE words.updated_at < EXCLUDED.updated_at
          `,
          [
            w.remoteId,
            userId,
            w.text,
            w.translation,
            w.example,
            w.sourceLang,
            w.targetLang,
            w.updatedAt,
          ]
        );

        // --- clear old tags ---
        await client.query(
          `DELETE FROM word_tags WHERE word_id = $1`,
          [w.remoteId]
        );

        // --- attach new tags ---
        for (const tagName of w.tags || []) {
          const tagId = await TagService.getOrCreateTag(
            client,
            userId,
            tagName
          );

          await client.query(
            `
            INSERT INTO word_tags (word_id, tag_id)
            VALUES ($1,$2)
            ON CONFLICT DO NOTHING
            `,
            [w.remoteId, tagId]
          );
        }
      }

      // 2️⃣ APPLY DELETES (SOFT DELETE)
      for (const id of changes.deletes || []) {
        await client.query(
          `
          UPDATE words
          SET deleted_at = NOW(), updated_at = NOW()
          WHERE id = $1 AND user_id = $2
          `,
          [id, userId]
        );
      }

      // 3️⃣ FETCH SERVER CHANGES (LATEST FIRST, WITH TAGS)
      const serverRes = await client.query(
        `
        SELECT
          w.*,
          COALESCE(
            ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL),
            '{}'
          ) AS tags
        FROM words w
        LEFT JOIN word_tags wt ON wt.word_id = w.id
        LEFT JOIN tags t ON t.id = wt.tag_id
        WHERE w.user_id = $1
          AND w.updated_at > $2
        GROUP BY w.id
        ORDER BY w.updated_at DESC
        `,
        [userId, lastSyncAt]
      );

      await client.query("COMMIT");

      return {
        serverChanges: serverRes.rows,
        syncedAt: new Date().toISOString(),
      };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }
}

export default new SyncService();
