import { pgPool } from "../db/index.js";
import { v4 as uuidv4 } from "uuid";

class TagService {
  // existing method
  // async getOrCreateTag(client, userId, name) {
  //   const res = await client.query(
  //     `
  //     INSERT INTO tags (user_id, name, usage_count)
  //     VALUES ($1, $2, 1)
  //     ON CONFLICT (user_id, name)
  //     DO UPDATE SET usage_count = tags.usage_count + 1
  //     RETURNING id
  //     `,
  //     [userId, name.toLowerCase()]
  //   );

  //   return res.rows[0].id;
  // }

  // NEW: tag suggestion
  async suggestTags(userId, query = "", limit = 10) {
    const res = await pgPool.query(
      `
      SELECT name
      FROM tags
      WHERE user_id = $1
        AND name ILIKE $2
      ORDER BY usage_count DESC, name ASC
      LIMIT $3
      `,
      [userId, `%${query}%`, limit],
    );

    return res.rows.map((r) => r.name);
  }

  async getAllTags(userId) {
    const res = await pgPool.query(
      `
      SELECT id, name, shared_code, shared_url
      FROM tags
      WHERE user_id = $1
      and is_deleted is not true
      and usage_count != 0
      ORDER BY usage_count DESC, name ASC
      `,
      [userId],
    );

    return res.rows.map((r) => ({
      tagId: r.id,
      tagName: r.name,
      sharedCode: r.shared_code,
      sharedURL: r.sharedURL,
    }));
  }

  async createOrRegenerateSharedCode(userId, tagName, regenerated) {
    const MAX_RETRY = 5;

    // get tag
    const tags = await pgPool.query(
      `
    SELECT id, name, shared_code, enabled_shared_code
    FROM tags
    WHERE name = $1
      AND user_id = $2
      AND is_deleted = FALSE
    `,
      [tagName, userId],
    );
    if (tags.rowCount == 0) return {
      success: false
    };

    if (
      !regenerated &&
      tags.rows[0].shared_code &&
      tags.rows[0].enabled_shared_code
    ) {
      return {
        success: true,
        tagId: tags.rows[0].id,
        tagName: tags.rows[0].name,
        sharedCode: tags.rows[0].shared_code,
        sharedURL: generateSharedURL(tags.rows[0].shared_code),
      };
    }

    for (let i = 0; i < MAX_RETRY; i++) {
      const sharedCode = generateSharedCode(tagName);

      try {
        const result = await pgPool.query(
          `
        UPDATE tags
        SET
          shared_code = $1,
          enabled_shared_code = TRUE,
          updated_at = NOW()
        WHERE id = $2
        RETURNING id, name, shared_code
        `,
          [sharedCode, tags.rows[0].id],
        );

        return {
          success: true,
          tagId: result.rows[0].id,
          tagName: result.rows[0].name,
          sharedCode: result.rows[0].shared_code,
          sharedURL: generateSharedURL(result.rows[0].shared_code),
        };
      } catch (err) {
        return {
          success: false
        }
      }
    }

    throw new Error("Unable to generate unique shared_code");
  }

  async deactivateSharedCode(userId, tagName) {
    const result = await pgPool.query(
      `
    UPDATE tags
    SET
      enabled_shared_code = FALSE,
      updated_at = NOW()
    WHERE name = $1
      AND user_id = $2
      AND is_deleted = FALSE
      AND enabled_shared_code = TRUE
    `,
      [tagName, userId],
    );

    if (result.rowCount === 0) {
      throw new Error("Shared code not found or already disabled");
    }

    return true;
  }

  async importWordsBySharedCode(userId, sharedCode) {
    try {
      await pgPool.query("BEGIN");
      // Validate shared tag
      const tag = await pgPool.query(
        `
      SELECT id, name, user_id
      FROM tags
      WHERE shared_code = $1
        AND enabled_shared_code = TRUE
        AND is_deleted = FALSE
      `,
        [sharedCode],
      );

      if (tag.rowCount == 0) {
        throw new Error("Invalid or expired shared code");
      }

      // Prevent self-import
      // if (tag.rows[0].user_id === userId) {
      //   return {
      //     success: false,
      //     message: "Cannot import your own shared tag",
      //   };
      // }
      const tagToImport = tag.rows[0];
      // Fetch words belonging to that tag
      const sourceWords = await pgPool.query(
        `
      SELECT *
      FROM words
      WHERE user_id = $1
        AND is_deleted = FALSE
        AND $2 = ANY(tags)
      `,
        [tagToImport.user_id, tagToImport.name],
      );

      if (sourceWords.rowCount === 0) {
        return {
          success: false,
          message: "No data available",
          importedCount: 0,
        };
      }

      // Insert copied words
      const insertQueries = sourceWords.rows.map((w) =>
        pgPool.query(
          `
        INSERT INTO words (
          id,
          user_id,
          term,
          translation,
          example,
          source_lang,
          target_lang,
          state,
          last_result,
          easy_streak,
          next_review_at,
          last_reviewed_at,
          total_reviews,
          tags,
          imported_source,
          ipa,
          created_at,
          updated_at,
          is_deleted
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7,
          NULL, NULL, 0,
          NULL, NULL, 0,
          $8,
          $9,
          $10,
          NOW(), NOW(), FALSE
        )
        `,
          [
            uuidv4(),
            userId,
            w.term,
            w.translation,
            w.example,
            w.source_lang,
            w.target_lang,
            [tagToImport.name], // imported tag only
            sharedCode, // imported_source
            w.ipa,
          ],
        ),
      );

      await Promise.all(insertQueries);
      await pgPool.query("COMMIT");
      return {
        success: true,
        importedCount: sourceWords.rowCount,
        tagName: tagToImport.name,
      };
    } catch (e) {
      await pgPool.query("ROLLBACK");
      return {
        success: false,
        message: "Import failed",
      };
    }
  }
}

export default new TagService();

function slugifyTagName(name, maxLength = 6) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "") // remove symbols & spaces
    .slice(0, maxLength);
}

function randomString(length = 6) {
  return Math.random()
    .toString(36)
    .substring(2, 2 + length);
}

function generateSharedCode(tagName) {
  const slug = slugifyTagName(tagName, 6); // e.g. "emotio"
  const rand = randomString(6); // e.g. "8f3a2c"

  return `${slug}-${rand}`.slice(0, 12);
}

function generateSharedURL(sharedCode) {
  if (process.env.SHARED_URL) {
    return process.env.SHARED_URL + sharedCode;
  }
  return "";
}
