export default Object.freeze({
  STATUS: {
    PENDING: "pending",
    VERIFIED: "verified",
    UNVERIFIED: "unverified",
  },

  REGEX_OBJECT_ID: /^(?=[a-f\d]{24}$)(\d+[a-f]|[a-f]+\d)/i,

  PROMPT_TYPES: {
    DICTIONARY: "dictionary",
    NORMAL: "normal",
  },

  DICTIONARY_SOURCES: {
    CHATGPT: "chatgpt",
    CAMBRIDGE: "cambridge",
  },

  ACTIVITY_TYPES: {
    IMPORT_CATEGORY: "import_category",
    LEARN_VOCABULARY: "learn_vocabulary",
  },
});

export const POPULARITY_LABELS = {
  VERY_EASY: "VERY_EASY",
  EASY: "EASY",
  MEDIUM: "MEDIUM",
  HARD: "HARD",
  VERY_HARD: "VERY_HARD",
};

export const DEFAULT_USER_SETTINGS = {
  words_per_day: 20,
  learning_speed: 1,
  native_lang: "vi",
  learning_lang: "en",
};

export const BATTLE_ROOM_STATUS = {
  WAITING: "WAITING",
  ACTIVE: "ACTIVE",
  ENDING: "ENDING",
  FINISHED: "FINISHED",
  CANCELLED: "CANCELLED",
};
