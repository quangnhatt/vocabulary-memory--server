import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pgPool } from "../db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------- CONFIG --------
const DATASETS = [{ file_name: "system_battle/data.json" }];

const SOURCE_LANG = "en";
const TARGET_LANG = "en";

const difficulties = ["VERY_EASY", "EASY", "MEDIUM", "HARD", "VERY_HARD"];
// ------------------------

async function run(fileName) {
  const JSON_FILE = path.join(__dirname, "../data/" + fileName);
  const raw = fs.readFileSync(JSON_FILE, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("JSON file must contain an array");
  }

  if (data.length === 0) return;
  for (const difficulty of difficulties) {
    try {
      await pgPool.query("BEGIN");
      console.log(`🚀 Importing vocab set: ${difficulty}`);

      // 1. Create vocab_set
      const vocabSetRes = await pgPool.query(
        `
      INSERT INTO vocab_sets (name, source_lang, target_lang, difficulty)
      VALUES ($1, $2, $3, $4)
      RETURNING id
      `,
        [`System vocab - ${difficulty}`, SOURCE_LANG, TARGET_LANG, difficulty],
      );

      const vocabSetId = vocabSetRes.rows[0].id;

      const items = data.filter((x) => x.difficulty == difficulty);
      // 2. Insert vocab pairs
      for (const item of items) {
        if (!item.term || !item.meaning) continue;

        await pgPool.query(
          `
        INSERT INTO vocab_pairs (vocab_set_id, word, meaning)
        VALUES ($1, $2, $3)
        `,
          [vocabSetId, item.term.trim(), item.meaning.trim()],
        );
      }

      await pgPool.query("COMMIT");
      console.log(`✅ Imported ${items.length} vocab items`);
    } catch (err) {
      await pgPool.query("ROLLBACK");
      console.error("❌ Vocab import failed:", err.message);
    }
  }
}

// Run all datasets
for (const ds of DATASETS) {
  run(ds.file_name);
}
