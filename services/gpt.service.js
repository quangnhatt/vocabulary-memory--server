import axios from "axios";
import { redis } from "../cache/redis.js";

const GPT_TTL = 60 * 60 * 6; // 6 hours

export async function askGPT(prompt, model = "gpt-4.1-mini") {
  const key = `gpt:${model}:${prompt}`;

  // 1. Check cache
  const cached = await redis.get(key);
  if (cached) {
    return { cached: true, text: cached };
  }

  // 2. Call OpenAI API
  const res = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.4,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
    }
  );

  const answer = res.data?.choices?.[0]?.message?.content ?? "";

  // 3. Cache response
  await redis.set(key, answer, "EX", GPT_TTL);

  return { cached: false, text: answer };
}
