import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pgPool } from "../db/index.js";
import { getPopularity, DEFAULT_POPULARITY_SCORE } from '../helpers/popularity.helper.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// -------- CONFIG --------

const DATASETS = [
  {
    file_name: "system_quiz/very_easy.json",
  },
   {
    file_name: "system_quiz/easy.json",
  },
   {
    file_name: "system_quiz/medium.json",
  },
   {
    file_name: "system_quiz/hard.json",
  },
   {
    file_name: "system_quiz/very_hard.json",
  },
];

// ------------------------

function fitsNumeric32(value) {
  if (value === null || value === undefined) return false;

  const num = Number(value);
  if (!Number.isFinite(num)) return false;

  // must be less than 10 in absolute value
  if (Math.abs(num) >= 10) return false;

  // must have at most 2 decimal places
  const decimals = num.toString().split(".")[1];
  if (decimals && decimals.length > 2) return false;

  return true;
}

async function run(fileName) {
  const JSON_FILE = path.join(__dirname, "../data/" + fileName);
  const raw = fs.readFileSync(JSON_FILE, "utf-8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error("JSON file must contain an array of questions");
  }

  try {
    await pgPool.query("BEGIN");
    console.log("Starting quiz import...");
    for (const question of data) {
      // 1. Insert question
      const popularityScore = DEFAULT_POPULARITY_SCORE[question.default_popularity];
      const questionRes = await pgPool.query(
        `
        INSERT INTO quiz_questions (
          prompt,
          default_popularity,
          popularity_score,
          categories,
          status
        )
        VALUES ($1, $2, $3, $4, 'active')
        RETURNING id
        `,
        [question.prompt, question.default_popularity, popularityScore, question.categories ?? []]
      );

      const questionId = questionRes.rows[0].id;

      // 2. Insert answers
      if (!Array.isArray(question.answers)) {
        throw new Error("Each question must have an answers array");
      }

      for (const ans of question.answers) {
        await pgPool.query(
          `
          INSERT INTO quiz_answers (
            question_id,
            option_text,
            answer_type,
            answer_point,
            explanation,
            status
          )
          VALUES ($1, $2, $3, $4, $5, 'active')
          `,
          [
            questionId,
            ans.option_text,
            ans.answer_type,
            ans.answer_point,
            ans.explanation ?? null,
          ]
        );
      }
    }

    await pgPool.query("COMMIT");
    console.log(`Imported ${data.length} quiz questions`);
  } catch (err) {
    await pgPool.query("ROLLBACK");
    console.error("Quiz import failed:", err.message);
  }
}

// Run all datasets
for (const ds of DATASETS) {
  run(ds.file_name);
}
