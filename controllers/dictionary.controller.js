import DictionaryService from "../services/dictionary.service.js";

class DictionaryController {
  async getDictionary(req, res) {
    const phrase = req.query.word || "";
    const result = await DictionaryService.getDictionary(phrase);
    res.json(result);
  }
}

export default new DictionaryController();
