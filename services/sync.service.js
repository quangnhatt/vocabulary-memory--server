import { pgPool } from "../db/postgres.js";

class SyncService {
  async syncWords({ userId, lastSyncAt, changes }) {
    const client = await pgPool.connect();

    try {
      await client.query("BEGIN");

      // 1. APPLY CLIENT UPSERTS
      for (const w of changes.upserts || []) {
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
      }

      // 2. APPLY CLIENT DELETES (SOFT DELETE)
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

      // 3. FETCH SERVER CHANGES (LATEST FIRST)
      const serverRes = await client.query(
        `
        SELECT *
        FROM words
        WHERE user_id = $1
          AND updated_at > $2
        ORDER BY updated_at DESC
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
