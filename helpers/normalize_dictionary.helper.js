import CONSTANTS from "../common/constants.js";

export function normalizeDictionary({
  word,
  data,
  source = CONSTANTS.DICTIONARY_SOURCES.CHATGPT,
}) {
  if (!data) return null;

  return {
    success: true,
    word: word ?? null,

    ipa: {
      uk: data.ipa || null,
      us: data.ipa || null, // fallback: same IPA if only one provided
    },

    entries: [
      {
        type: data.pos || null,

        meanings: [
          {
            meaning: data.translation || null,

            examples: data.example
              ? [
                  {
                    phrase: null,
                    sentence: data.example,
                  },
                ]
              : [],
          },
        ],
      },
    ],

    source: source,
  };
}
