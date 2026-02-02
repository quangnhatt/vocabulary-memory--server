import puppeteer from "puppeteer";
import CONSTANTS, { DICTIONARY_SOURCES } from "../common/constants.js";

export async function doCrawlCambridgeWithPuppeteer(source_language, word) {
  if (source_language !== "en") {
    return { success: false, error: "Only English is supported" };
  }
  if (!word) {
    return { success: false, error: "Word is required" };
  }

  const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(
    word,
  )}`;
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        // "--no-zygote",
        // "--single-process",
      ],
    });

    // browser = await puppeteer.launch({
    //   executablePath: "/usr/bin/google-chrome",
    //   headless: "new",
    //   args: [
    //     "--no-sandbox",
    //     "--disable-setuid-sandbox",
    //     "--disable-dev-shm-usage",
    //   ],
    // });

    // browser = await puppeteer.launch({
    //   executablePath: "/snap/bin/chromium", // 👈 system Chromium
    //   headless: "new",
    //   args: [
    //     "--no-sandbox",
    //     "--disable-setuid-sandbox",
    //     "--disable-dev-shm-usage",
    //     "--disable-gpu",
    //   ],
    // });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    // await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
    // await page.waitForSelector(".pr.dictionary", { timeout: 15000 });
    await page.setDefaultNavigationTimeout(60000);
    await page.setDefaultTimeout(30000);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 10000,
    });

    //1. Detect block / challenge
    let isBlocked = await page.$(
      "body > pre, .captcha, #cf-wrapper, iframe[src*='captcha']",
    );

    if (isBlocked) {
      throw new Error("Cambridge blocked or challenge page detected");
    }

    // 2. Detect 'word not found'
    const notFound = await page.evaluate(() => {
      // Case 1: Redirected to spellcheck page
      if (window.location.pathname.includes("/spellcheck")) {
        return true;
      }

      // Case 2: Explicit 'no result' message
      const text = document.body.innerText.toLowerCase();

      if (
        text.includes("did you mean") ||
        text.includes("no results found") ||
        text.includes("we couldn’t find")
      ) {
        return true;
      }

      // Case 3: No dictionary blocks at all
      const hasDictionary = document.querySelector(".pr.dictionary");
      return !hasDictionary;
    });

    if (notFound) {
      return {
        success: false,
        word,
        error: "WORD_NOT_FOUND",
      };
    }

    await page.waitForSelector(".pr.dictionary", {
      timeout: 10000,
      visible: true,
    });
    isBlocked = await page.$("body > pre, .captcha, #cf-wrapper");
    if (isBlocked) {
      throw new Error("Cambridge blocked or challenge page detected");
    }

    const result = await page.evaluate(() => {
      const getIpa = (region) =>
        document.querySelector(`.${region} .ipa.dipa`)?.innerText.trim() ||
        null;

      const ipa = {
        uk: getIpa("uk"),
        us: getIpa("us"),
      };
      const entries = Array.from(document.querySelectorAll(".pr.dictionary"))
        .map((posBlock) => {
          // 🧩 Part of speech (noun / verb / adj)
          const type = posBlock.querySelector(".pos.dpos")?.innerText.trim();

          if (!type) return null;

          const meanings = Array.from(posBlock.querySelectorAll(".ddef_block"))
            .map((defBlock) => {
              const meaning = defBlock.querySelector(".def")?.innerText.trim();

              if (!meaning) return null;

              const examples = Array.from(defBlock.querySelectorAll(".examp"))
                .map((ex) => {
                  const phrase =
                    ex.querySelector(".lu.dlu")?.innerText.trim() || null;

                  const sentence =
                    ex.querySelector(".eg.deg")?.innerText.trim() || null;

                  return sentence ? { phrase, sentence } : null;
                })
                .filter(Boolean);

              return {
                meaning,
                examples,
              };
            })
            .filter(Boolean);

          return meanings.length ? { type, meanings } : null;
        })
        .filter(Boolean);

      return { ipa, entries };
    });

    console.log(result);
    if (!result.entries.length) {
      return {
        success: false,
        word,
        error: "No definitions found",
      };
    }
    return {
      success: true,
      word,
      ipa: result.ipa,
      entries: result.entries,
      source: DICTIONARY_SOURCES.CAMBRIDGE,
    };
  } catch (error) {
    console.log(error);
    return {
      success: false,
      word,
      error: error.message,
    };
  } finally {
    if (browser) await browser.close();
  }
}

export async function doCrawlGoogleTranslateWithPuppeteer({
  text,
  sl = "en",
  tl = "vi",
}) {
  if (!text) {
    return { success: false, error: "Text is required" };
  }

  const url = `https://translate.google.com/details?sl=${sl}&tl=${tl}&text=${encodeURIComponent(
    text,
  )}&op=translate`;

  let browser;

  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();

    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
    );

    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 15000,
    });

    //   Wait for translation result
    await page.waitForFunction(
      () => {
        return document.body.innerText.length > 0;
      },
      { timeout: 10000 },
    );

    const result = await page.evaluate(() => {
      const bodyText = document.body.innerText;

      // Main translation (top)
      const translation =
        document.querySelector("span[jsname='W297wb']")?.innerText ||
        document.querySelector("[data-language-for-alternatives]")?.innerText ||
        null;

      // Meanings (dictionary section)
      const meanings = [];

      document.querySelectorAll("section").forEach((section) => {
        const pos = section.querySelector("h3")?.innerText;
        if (!pos) return;

        const defs = Array.from(section.querySelectorAll("li span"))
          .map((el) => el.innerText)
          .filter(Boolean);

        if (defs.length) {
          meanings.push({ pos, meanings: defs });
        }
      });

      // Examples
      const examples = [];

      document.querySelectorAll("div").forEach((div) => {
        const text = div.innerText;
        if (text.includes("•") && text.split("•").length === 2) {
          const [source, target] = text.split("•");
          examples.push({
            source: source.trim(),
            target: target.trim(),
          });
        }
      });

      return {
        translation,
        meanings,
        examples,
      };
    });

    if (!result.translation) {
      return {
        success: false,
        text,
        error: "TRANSLATION_NOT_FOUND",
        source: "Google Translate",
      };
    }

    return {
      success: true,
      source: "Google Translate",
      from: sl,
      to: tl,
      text,
      ...result,
    };
  } catch (error) {
    return {
      success: false,
      text,
      error: error.message,
      source: "Google Translate",
    };
  } finally {
    if (browser) await browser.close();
  }
}
