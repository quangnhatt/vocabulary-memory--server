import DictionaryService from "../services/dictionary.service.js";

class DictionaryController {
  async getDictionary(req, res) {
    const result = await DictionaryService.getDictionary(req.body.word || "");
    res.json(result);
  }
}

export default new DictionaryController();
