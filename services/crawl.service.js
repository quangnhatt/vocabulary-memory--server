import axios from "axios";
import * as cheerio from "cheerio";

class CrawlService {
  async crawlCambridgeDictionary(word) {
    if (!word) {
      return {
        success: false,
        error: 'Word is required',
      };
    }

    const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(
      word
    )}`;

    try {
      const response = await axios.get(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
          "Accept-Language": "en-US,en;q=0.9",
        },
      });

      const $ = cheerio.load(response.data);

      const meanings = [];
      const examples = [];

      // Meaning blocks
      $(".def-block").each((_, el) => {
        const meaning = $(el).find(".def").first().text().trim();

        if (meaning) meanings.push(meaning);

        $(el)
          .find(".examp")
          .each((_, ex) => {
            const example = $(ex).text().trim();
            if (example) examples.push(example);
          });
      });

      if (meanings.length === 0) {
        return {
          word,
          error: "No definition found",
        };
      }

      return {
        word,
        meanings,
        examples,
        source: "Cambridge Dictionary",
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }
}
export default new CrawlService();
