import { pgPool } from "../db/index.js";
import CONSTANTS from "../common/constants.js";
import { doCrawlWithPuppeteer } from "../helpers/crawl.helper.js";
import { normalizeDictionary } from "../helpers/normalize_dictionary.helper.js";
import { askGPT } from "../helpers/gpt.helper.js";

class DictionaryService {
  async getDictionary(word) {
    const dic = await this.fetchDictionaryFromDb(word);
    if (dic != null) return dic;
    // Temporarily
    // return { success: false, error: "Generating words disabled" };
    let result = await doCrawlWithPuppeteer(word);
    if (!result.success) {
      const gptResponse = await askGPT({
        type: CONSTANTS.PROMPT_TYPES.DICTIONARY,
        prompt: word,
      });
      if (gptResponse.success) {
        result = normalizeDictionary({
          word: word,
          data: JSON.parse(gptResponse.text),
          source: CONSTANTS.DICTIONARY_SOURCES.CHATGPT,
        });
      }
    }
    if (result.success) {
      await this.saveToDictionary(result);
    }

    return result;
  }
  async fetchDictionaryFromDb(word) {
    const { rows } = await pgPool.query(
      `
    SELECT
      w.word,
      w.ipa_uk,
      w.ipa_us,
      w.source,
      e.part_of_speech,
      m.id AS meaning_id,
      m.meaning,
      m.order_index AS meaning_order,
      ex.phrase,
      ex.sentence,
      ex.order_index AS example_order
    FROM dictionary_word w
    JOIN dictionary_entry e ON e.word_id = w.id
    JOIN dictionary_meaning m ON m.entry_id = e.id
    LEFT JOIN dictionary_example ex ON ex.meaning_id = m.id
    WHERE w.word = $1
    ORDER BY
      e.part_of_speech,
      m.order_index,
      ex.order_index
    `,
      [word]
    );

    if (!rows.length) return null;

    /* ─────────────────────────────
     Rebuild nested structure
  ───────────────────────────── */
    const ipa_uk = rows[0]["ipa_uk"];
    const ipa_us = rows[0]["ipa_us"];
    const source = rows[0]["source"];
    const entriesMap = new Map();

    for (const r of rows) {
      if (!entriesMap.has(r.part_of_speech)) {
        entriesMap.set(r.part_of_speech, {
          type: r.part_of_speech,
          meanings: [],
        });
      }

      const entry = entriesMap.get(r.part_of_speech);

      let meaning = entry.meanings.find((m) => m.meaning === r.meaning);

      if (!meaning) {
        meaning = {
          meaning: r.meaning,
          examples: [],
        };
        entry.meanings.push(meaning);
      }

      if (r.sentence) {
        meaning.examples.push({
          phrase: r.phrase,
          sentence: r.sentence,
        });
      }
    }

    return {
      success: true,
      word,
      source,
      ipa: { uk: ipa_uk, us: ipa_us },
      entries: Array.from(entriesMap.values()),
      fromCache: true,
    };
  }

  async saveToDictionary(crawlResult) {
    try {
      await pgPool.query("BEGIN");

      const {
        word,
        entries,
        source,
        ipa,
      } = crawlResult;

      /* ─────────────────────────────
       1. WORD
    ───────────────────────────── */
      const wordRes = await pgPool.query(
        `
      INSERT INTO dictionary_word (word, source, ipa_uk, ipa_us)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (word)
      DO UPDATE SET word = EXCLUDED.word
      RETURNING id
      `,
        [word, source, ipa.uk, ipa.us]
      );

      const wordId = wordRes.rows[0].id;

      /* ─────────────────────────────
       2. PARTS OF SPEECH
    ───────────────────────────── */
      for (const entry of entries) {
        const entryRes = await pgPool.query(
          `
        INSERT INTO dictionary_entry (word_id, part_of_speech)
        VALUES ($1, $2)
        ON CONFLICT (word_id, part_of_speech)
        DO UPDATE SET part_of_speech = EXCLUDED.part_of_speech
        RETURNING id
        `,
          [wordId, entry.type]
        );

        const entryId = entryRes.rows[0].id;

        /* ─────────────────────────────
         3. MEANINGS
      ───────────────────────────── */
        for (let i = 0; i < entry.meanings.length; i++) {
          const m = entry.meanings[i];

          const meaningRes = await pgPool.query(
            `
          INSERT INTO dictionary_meaning (entry_id, meaning, order_index)
          VALUES ($1, $2, $3)
          RETURNING id
          `,
            [entryId, m.meaning, i]
          );

          const meaningId = meaningRes.rows[0].id;

          /* ─────────────────────────────
           4. EXAMPLES
        ───────────────────────────── */
          for (let j = 0; j < m.examples.length; j++) {
            const ex = m.examples[j];

            await pgPool.query(
              `
            INSERT INTO dictionary_example (meaning_id, phrase, sentence, order_index)
            VALUES ($1, $2, $3, $4)
            `,
              [meaningId, ex.phrase, ex.sentence, j]
            );
          }
        }
      }

      await pgPool.query("COMMIT");

      return { success: true, word };
    } catch (error) {
      await pgPool.query("ROLLBACK");
      throw error;
    } finally {
      // client.release();
    }
  }
}

export default new DictionaryService();
