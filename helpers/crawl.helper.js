import puppeteer from "puppeteer";

export async function doCrawlWithPuppeteer(word) {
  if (!word) {
    return { success: false, error: "Word is required" };
  }

  console.log("STARTING CRAWL " + word);
  const url = `https://dictionary.cambridge.org/dictionary/english/${encodeURIComponent(
    word
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
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
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
      "body > pre, .captcha, #cf-wrapper, iframe[src*='captcha']"
    );

    if (isBlocked) {
      throw new Error("Cambridge blocked or challenge page detected");
    }

    // 2. Detect 'word not found'
    const notFound = await page.evaluate(() => {
      // Case 1: Redirected to spellcheck page
      if (window.location.pathname.includes("/spellcheck")) {
        console.log("Spell check");
        return true;
      }

      // Case 2: Explicit 'no result' message
      const text = document.body.innerText.toLowerCase();

      if (
        text.includes("did you mean") ||
        text.includes("no results found") ||
        text.includes("we couldn’t find")
      ) {
        console.log("No result");
        return true;
      }

      // Case 3: No dictionary blocks at all
      const hasDictionary = document.querySelector(".pr.dictionary");
      console.log("No dictionary blocks");
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
      source: "Cambridge Dictionary",
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

async function crawlCambridgeDictionaryWithAxios(word) {
  if (!word) {
    return {
      success: false,
      error: "Word is required",
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
