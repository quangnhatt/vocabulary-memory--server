import DictionaryService from "../services/dictionary.service.js";
import {askGPT} from "../helpers/gpt.helper.js";
import CONSTANTS from "../common/constants.js";

class DictionaryController {
  async getDictionary(req, res) {
    const phrase = req.query.word || "";
    const result = await DictionaryService.getDictionary(phrase);
    if (!result || !result.success){
      const content = await askGPT({type: CONSTANTS.PROMPT_TYPES.DICTIONARY, prompt: phrase});
    }
    res.json(result);
  }
}

export default new DictionaryController();
