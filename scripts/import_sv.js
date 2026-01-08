import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pgPool } from "../db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------- CONFIG --------
const SOURCE_LANG = "en";
const TARGET_LANG = "vi";
const CATEGORY_ID = "8dec92a2-3a47-4799-9885-b9c198b0710e"; //"b9f1d4fa-9ed7-416e-8b7c-e086a632a9ae"; // ⬅️ REQUIRED
const JSON_FILE = path.join(__dirname, "../data/ielt_6_6-5.json");


// ------------------------

async function run() {
  const raw = fs.readFileSync(JSON_FILE, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("JSON file must contain an array");
  }

  try {
    await pgPool.query('BEGIN');

    for (const item of data) {
      await pgPool.query(
        `
        INSERT INTO system_vocabularies (
          category_id,
          term,
          ipa,
          target_translation,
          source_translation,
          example,
          pos,
          source_lang,
          target_lang,
          popular_score,
          difficulty,
          collocations,
          synonyms,
          topics,
          skills
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
        )
        `,
        [
          CATEGORY_ID,
          item.term,
          item.ipa,
          item.target_translation,
          item.source_translation,
          item.example,
          item.pos,
          item.source_lang,
          item.target_lang,
          item.popular_score,
          item.difficulty,
          item.collocations ?? [],
          item.synonyms ?? [],
          item.topics ?? [],
          item.skills ?? [],
        ]
      );
    }

    await pgPool.query('COMMIT');
    console.log(`✅ Imported ${data.length} records`);
  } catch (err) {
    await pgPool.query('ROLLBACK');
    console.error('❌ Import failed:', err);
  } finally {
    // pgPool.release();
    // await pool.end();
  }
}

run();