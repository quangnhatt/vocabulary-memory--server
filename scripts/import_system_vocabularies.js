import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pgPool } from "../db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------- CONFIG --------
const SOURCE_LANG = "en";
const TARGET_LANG = "vi";
const CATEGORY_ID = "214e07e1-5062-4316-b2a8-aac247a06957"; // ⬅️ REQUIRED
const JSON_FILE = path.join(__dirname, "../data/lifestyle_phrases.json");

// Difficulty → popularity score
const difficultyScoreMap = {
  easy: 3,
  medium: 2,
  hard: 1,
};

// ------------------------

async function run() {
  const raw = fs.readFileSync(JSON_FILE, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("JSON file must contain an array");
  }

  try {
    await pgPool.query("BEGIN");

    let inserted = 0;
    let skipped = 0;

    for (const item of data) {
      const term = item.term?.trim();
      const definition = item.translation?.trim();
      const example = item.example?.trim() || null;
      const difficulty = item.difficulty?.toLowerCase() || "medium";

      if (!term || !definition) {
        console.warn("Skipping invalid item:", item);
        skipped++;
        continue;
      }

      const popularScore =
        difficultyScoreMap[difficulty] ?? 1;

      // 🔍 Check duplicate
      const exists = await pgPool.query(
        `
        SELECT 1
        FROM system_vocabularies
        WHERE lower(term) = lower($1)
          AND source_lang = $2
          AND target_lang = $3
          AND deleted_at IS NULL
        LIMIT 1
        `,
        [term, SOURCE_LANG, TARGET_LANG]
      );

      if (exists.rowCount > 0) {
        skipped++;
        continue;
      }

      // ➕ Insert
      await pgPool.query(
        `
        INSERT INTO system_vocabularies (
          category_id,
          term,
          translation,
          example,
          source_lang,
          target_lang,
          popular_score,
          created_at,
          updated_at
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,NOW(),NOW()
        )
        `,
        [
          CATEGORY_ID,
          term,
          definition,
          example,
          SOURCE_LANG,
          TARGET_LANG,
          popularScore,
        ]
      );

      inserted++;
    }

    await pgPool.query("COMMIT");

    console.log(`✅ Import completed`);
    console.log(`➕ Inserted: ${inserted}`);
    console.log(`⏭ Skipped: ${skipped}`);
  } catch (err) {
    await pgPool.query("ROLLBACK");
    console.error("❌ Import failed:", err);
  } finally {
    process.exit(0);
  }
}

run();