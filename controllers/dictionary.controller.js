import DictionaryService from "../services/dictionary.service.js";

class DictionaryController {
  async getDictionary(req, res) {
    const phrase = req.query.word || "";
    const sl = req.query.sl || "en";
    const tl = req.query.tl || "vi";
    const result = await DictionaryService.getDictionary(sl, tl, phrase);
    res.json(result);
  }
}

export default new DictionaryController();
