import { redis } from "../cache/redis.js";
import crypto from "crypto";
import { PROMPT_TYPES, DICTIONARY_SOURCES } from "../common/constants.js";
import OpenAI from "openai";
import { mapLanguageCode } from "./language.helper.js";

const GPT_TTL = 60 * 60 * 6; // 6 hours

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function askGPT({
  type,
  prompt,
  source_language,
  target_language,
  model = "gpt-4.1-mini",
}) {
  if (!prompt || prompt.length > 500)
    return {
      success: false,
      message: "Prompt is required or has 500 characters at maximum.",
    };
  if (type == PROMPT_TYPES.DICTIONARY) {
    prompt = buildDictionaryPrompt({
      phrase: prompt,
      source_language,
      target_language,
    });
  }
  else if (type == PROMPT_TYPES.ADVANCED_LEARNING){
     prompt = buildStukWordExercisePrompt({
      source_language,
      phrase: prompt,
    });
  } else {
    prompt = buildNormalPrompt({ message: prompt });
  }

  // 1. Check cache
  const key = buildCacheKey({
    model,
    type,
    prompt,
    source_language,
    target_language,
  });
  const cached = await redis.get(key);

  if (cached) {
    return {
      success: true,
      cached: true,
      text: cached,
      source: DICTIONARY_SOURCES.CHATGPT,
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: model,
      temperature: 0.4,
      max_tokens: 300,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.choices[0]?.message?.content;

    // 3. Cache response
    await redis.set(key, content, "EX", GPT_TTL);

    //
    return {
      success: true,
      cached: false,
      text: content,
      source: DICTIONARY_SOURCES.CHATGPT,
    };
  } catch (err) {
    console.error("Get GPT failed:", err.message);
    return { success: false, message: err.message };
  }
}

function buildDictionaryPrompt({
  source_language = "en",
  target_language = "vi",
  phrase,
}) {
  source_language = mapLanguageCode(source_language);
  target_language = mapLanguageCode(target_language);
  return `
You are an ${source_language}-to-${target_language} dictionary assistant.
Generate data using this phrase:
          "${phrase}"
          Rules:
          - JSON format only
          - Translation in ${target_language}
          - Example in simple, neutral ${source_language}
          - No explanation
          - If the phrase does not exist or is meaningless, return {"success": false, "reason": ""}
          
Format:
{ "ipa": "", "translation": "", "pos": "", "example": "..." }
`.trim();
}

function buildStukWordExercisePrompt({ source_language = "en", phrase }) {
  source_language = mapLanguageCode(source_language);
  return `
You are a ${source_language} vocabulary-learning content generator for a language-learning app.
Generate data using this phrase:
          "${phrase}"
          Rules:
          - JSON format only
          - Use natural, real-life English.
          - No explanation, no markdown
          - At least 1 item for each question_type in learning_modes
          - If the phrase does not exist or is meaningless, return {"success": false, "reason": ""}
          
Format:
{ "term": "", "learning_modes": [ { "mode": "", "question_type": "fill_the_gap | single_choice | free_input", "prompt": "", // include based on question_type // fill_the_gap → "answer" // single_choice → "options" (string[]), "correct_index" (number) // free_input → "suggested_answer" } ] }
`.trim();
}

function buildNormalPrompt({ message }) {
  return `${message.trim()}`;
}

function normalizePrompt(input) {
  if (!input || typeof input !== "string") return "";

  return input
    .trim()
    .toLowerCase()
    .replace(/\r\n|\r/g, "\n") // normalize line breaks
    .replace(/\s+/g, " ") // collapse spaces
    .replace(/[“”]/g, '"') // normalize quotes
    .replace(/[‘’]/g, "'") // normalize apostrophes
    .replace(/[.!?]+$/g, ""); // remove trailing punctuation
}

function buildCacheKey({
  model,
  type,
  prompt,
  target_language,
  source_language,
}) {
  const normalizedKey = normalizePrompt(prompt);

  return crypto
    .createHash("sha256")
    .update(
      `gpt:${model}:${type}:${target_language}:${source_language}:${normalizedKey}`,
    )
    .digest("hex");
}
