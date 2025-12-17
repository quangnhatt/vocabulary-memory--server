import axios from "axios";
import { redis } from "../cache/redis.js";
import { askGPT } from "./gpt.service.js";

const TTL = 60 * 60 * 24 * 30;

class TranslateService {
  //---------------------------------------------------------------------------
  // GOOGLE TRANSLATE (UNOFFICIAL) — ALSO USED FOR LANGUAGE DETECTION
  //---------------------------------------------------------------------------
  async googleTranslateAndDetect(text, source, target) {
    // If source != auto → do NOT use auto detection
    const sl = source === "auto" ? "auto" : source;

    const url =
      "https://translate.googleapis.com/translate_a/single" +
      `?client=gtx&sl=${sl}&tl=${target}&dt=t&q=${encodeURIComponent(text)}`;

    try {
      const res = await axios.get(url, {
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      const translation = res.data?.[0]?.[0]?.[0] ?? "";

      // If source was provided → no auto detection needed
      const detectedSource = source === "auto" ? res.data?.[2] ?? "en" : source;

      return { translation, detectedSource };
    } catch (err) {
      if (err.response?.status === 429) {
        console.log("⚠ Google 429 Too Many Requests");
        throw new Error("GOOGLE_BLOCKED");
      }
      throw err;
    }
  }

  //---------------------------------------------------------------------------
  // MYMEMORY TRANSLATE (requires valid ISO source)
  //---------------------------------------------------------------------------
  async myMemoryTranslate(text, source, target) {
    try {
      // If source = auto and we couldn't detect, default to "en"
      const src = source === "auto" ? "en" : source;
      const url =
        `https://api.mymemory.translated.net/get` +
        `?q=${encodeURIComponent(text)}` +
        `&langpair=${src}|${target}`;

      const res = await axios.get(url);

      return res.data?.responseData?.translatedText ?? "";
    } catch (err) {
      console.log("⚠ MyMemory failed:", err.message);
      throw new Error("MYMEMORY_FAILED");
    }
  }

  //---------------------------------------------------------------------------
  // GPT FINAL FALLBACK
  //---------------------------------------------------------------------------
  async gptFallback(text, target) {
    const prompt = `Translate this into ${target}:\n${text}`;
    return await askGPT(prompt);
  }

  //---------------------------------------------------------------------------
  // MAIN PIPELINE (UPDATED: includes source parameter)
  //---------------------------------------------------------------------------
  async translateText(text, source = "auto", target = "en") {
    let langpair = `${source}_${target}`;
    const cacheKey = `translate:${langpair}:${text}`;

    // 1. Check Redis cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return {
        cached: true,
        text,
        translation: cached,
        langpair,
      };
    }

    let translated = "";
    let detectedSource = source;

    // 2. Google translate + detect
    try {
      const result = await this.googleTranslateAndDetect(text, source, target);
      translated = result.translation;
      detectedSource = result.detectedSource;
      langpair = `${detectedSource}_${target}`;
    } catch (err) {
      // Google failed → fallback to MyMemory
      if (err.message === "GOOGLE_BLOCKED") {
        try {
          translated = await this.myMemoryTranslate(text, source, target);
        } catch (err2) {
          translated = await this.gptFallback(text, target);
        }
      } else {
        throw err;
      }
    }

    // 3. If Google gave blank output → try MyMemory with detected language
    if (!translated || translated.trim() === "") {
      try {
        translated = await this.myMemoryTranslate(
          detectedSource,
          detectedSource,
          target
        );
      } catch (err3) {
        translated = await this.gptFallback(text, target);
      }
    }

    // 4. Cache final translation
    await redis.set(cacheKey, translated, "EX", TTL);

    return {
      cached: false,
      text,
      translation: translated,
      langpair,
    };
  }
}

export default new TranslateService();
