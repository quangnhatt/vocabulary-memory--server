import LearningModeRepository from "../repositories/learning_modes.repo.js";
import { askGPT } from "../helpers/gpt.helper.js";
import { PROMPT_TYPES } from "../common/constants.js";

class LearningModeService {
  async ingestAdvancedLearning(source_language, word) {
    if (!source_language || !word) {
      throw new Error("Phrase or language is required");
    }
    const gptResponse = await askGPT({
      type: PROMPT_TYPES.ADVANCED_LEARNING,
      prompt: word,
      source_language: source_language,
    });

    let payload = {};
    payload = JSON.parse(gptResponse.text);

    if (!payload || !payload.term || !Array.isArray(payload.learning_modes)) {
      return {
        success: false,
        message: "Invalid payload structure",
      };
    }

    if (!gptResponse.success) {
      return {
        success: false,
        message: payload.reason,
      };
    }

    const { term, learning_modes } = payload;
    const results = [];

    for (const item of learning_modes) {
      const {
        id,
        mode,
        question_type,
        prompt,
        answer,
        options,
        correct_index,
        suggested_answer,
      } = item;

      // Basic validation
      if (!mode || !question_type || !prompt) {
        return {
          success: false,
          message: `Missing required fields in learning mode: ${JSON.stringify(item)}`,
        };
      }

      const record = await LearningModeRepository.upsertLearningMode({
        id: id ?? null,
        source_language,
        term,
        mode,
        question_type,
        prompt,
        answer: answer ?? null,
        options: options ?? null,
        correct_index: correct_index ?? null,
        suggested_answer: suggested_answer ?? null,
      });

      results.push(record);
    }

    return {
      success: true,
      source_language,
      term: word,
      learning_modes: results,
    };
  }

  async getAdvancedLearningByTerm(source_language, term) {
    if (!term || !source_language) {
      return {
        success,
        message: "Language or term is required",
      };
    }
    term = term.trim();

    const record = await LearningModeRepository.getLearningModesByTerm(
      term,
      source_language,
    );

    return {
      success: true,
      ...record,
    };
  }
}

export default new LearningModeService();
