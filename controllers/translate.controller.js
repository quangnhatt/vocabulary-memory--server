import translateService from "../services/translate.service.js";

class TranslateController {
  async doTranslate(req, res, next) {
    try {
      const text = req.query.text;
      const sl = req.query.sl || "en";
      const tl = req.query.tl || "vi";

      const translated = await translateService.translateText(text, sl, tl);

      return res.json(translated);
    } catch (ex) {
      console.error("TranslateController error:", ex);
      return res.status(500).json({ error: "Translate failed" });
    }
  }
}

export default new TranslateController();
