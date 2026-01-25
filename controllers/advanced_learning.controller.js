import LearningModeService from "../services/advanced_learning.service.js";

class AdvancedLearningController {
  // async ingestLearningModes(req, res) {
  //   try {
  //     const phrase = req.query.word || "";
  //     const sl = req.query.sl || "en";
  //     const tl = req.query.tl || "vi";

  //     const result = await LearningModeService.ingestAdvancedLearning(sl, phrase);
  //     res.json(result);
  //   } catch (e) {
  //     res.status(400).json({ error: e.message });
  //   }
  // }

  async getAdvancedLearningByTerm(req, res){
     try {
      const phrase = req.query.word || "";
      const sl = req.query.sl || "en";

      let result = await LearningModeService.getAdvancedLearningByTerm(sl, phrase);

      if (!result || !result.success || result.learning_modes.length == 0){
          result = await LearningModeService.ingestAdvancedLearning(sl, phrase);
      }
      res.json(result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }

  
}
export default new AdvancedLearningController();
