import axios from "axios";
import { redis } from "../cache/redis.js";

const TTL = 60 * 60 * 24 * 30; // 30 days

// rotate headers to avoid Google blocking
function getHeaders() {
  return {
    "User-Agent":
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
  };
}

async function googleTranslate(text, target) {
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${target}&dt=t&q=${encodeURIComponent(
    text
  )}`;

  try {
    const res = await axios.get(url, { headers: getHeaders() });
    return res.data?.[0]?.[0]?.[0] ?? "";
  } catch (e) {
    // if Google blocks → retry after delay
    if (e.response?.status === 429) {
      console.log("429 detected → retrying in 500ms");
      await new Promise((resolve) => setTimeout(resolve, 500));

      const res = await axios.get(url, { headers: getHeaders() });
      return res.data?.[0]?.[0]?.[0] ?? "";
    }
    throw e;
  }
}

class TranslateService {
  async translateText(text, sl = "en", tl = "vi") {
    const key = `translate:${sl}_${tl}:${text}`;

    // 1. Check Redis cache
    const cached = await redis.get(key);
    if (cached) return { cached: true, text: text, translation: cached };

    // 2. Call Google Translate with retry
    const translation = await googleTranslate(text, tl);

    // 3. Cache response
    await redis.set(key, translation, "EX", TTL);

    return { cached: false, text: text, translation: translation };
  }
}

export default new TranslateService();
