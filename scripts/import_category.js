import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pgPool } from "../db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------- CONFIG -------

const DATASETS = [
  // {
  //   category_id: "fd05cc32-76d8-4855-a9af-fd069319c546",
  //   file_name: "daily_life_and_routine.json",
  // },
  // {
  //   category_id: "b9893a89-24d7-4d5c-b985-c7671598228e",
  //   file_name: "emotions_and_feelings.json",
  // },
  // {
  //   category_id: "8198242e-54ba-40f7-a574-a3af5a17272f",
  //   file_name: "environment.json",
  // },
  // {
  //   category_id: "f4bfcc71-0ed9-4d93-af6d-8f602b49f642",
  //   file_name: "ielts_writing_task_1.json",
  // },
  // {
  //   category_id: "449cd936-0938-43ca-97d0-a9f273f83e40",
  //   file_name: "relationships_and_social_life.json",
  // },
  {
    category_id: "800f33da-8368-43c6-9135-84bba549e29c", //800f33da-8368-43c6-9135-84bba549e29c
    file_name: "human_appearance_personality.json",
  }
];

// ------------------------

async function run(categoryId, fileName) {
  const JSON_FILE = path.join(__dirname, "../data/" + fileName);
  const raw = fs.readFileSync(JSON_FILE, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("JSON file must contain an array");
  }

  try {
    await pgPool.query("BEGIN");

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
          categoryId,
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

    await pgPool.query("COMMIT");
    console.log(`✅ Imported ${data.length} records`);
  } catch (err) {
    await pgPool.query("ROLLBACK");
    console.error("❌ Import failed:", err);
  } finally {
    // pgPool.release();
    // await pool.end();
  }
}
for (const cat of DATASETS) {
  run(cat.category_id, cat.file_name);
}
