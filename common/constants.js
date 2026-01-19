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
    CAMBRIDGE: "cambridge"
  },

  ACTIVITY_TYPES: {
    IMPORT_CATEGORY: "import_category",
    LEARN_VOCABULARY: "learn_vocabulary",
  },
});


export const POPULARITY_LABELS = {
  VERY_COMMON: 'VERY_COMMON',
  COMMON: 'COMMON',
  FREQUENT: 'FREQUENT',
  UNCOMMON: 'UNCOMMON',
  RARE: 'RARE'
};