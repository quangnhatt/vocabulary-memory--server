import { redis } from "../cache/redis.js";
import crypto from "crypto";
import CONSTANTS from "../common/constants.js";
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
  if (type == CONSTANTS.PROMPT_TYPES.DICTIONARY) {
    prompt = buildDictionaryPrompt({
      phrase: prompt,
      source_language,
      target_language,
    });
  } else {
    prompt = buildNormalPrompt({ message: prompt });
  }

  // 1. Check cache
  const key = buildCacheKey({ model, type, prompt, source_language, target_language });
  const cached = await redis.get(key);

  if (cached) {
    return {
      success: true,
      cached: true,
      text: cached,
      source: CONSTANTS.DICTIONARY_SOURCES.CHATGPT,
    };
  }

  try {
    const response = await client.chat.completions.create({
      model: model,
      temperature: 0.4,
      max_tokens: 150,
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
      source: CONSTANTS.DICTIONARY_SOURCES.CHATGPT,
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
          
Format:
{ "ipa": "", "translation": "", "pos": "", "example": "..." }
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
      `gpt:${model}:${type}:${target_language}:${source_language}:${normalizedKey}`
    )
    .digest("hex");
}
