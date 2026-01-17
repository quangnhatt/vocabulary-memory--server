// languageMap.js
const LANGUAGE_MAP = {
  en: 'English',
  vi: 'Vietnamese',
  fr: 'French',
  de: 'German',
  es: 'Spanish',
  ja: 'Japanese',
  ko: 'Korean',
  zh: 'Chinese',
  it: 'Italian',
  ru: 'Russian',
  pt: 'Portuguese'
};

export function mapLanguageCode(code) {
  if (!code) return 'Unknown';

  return LANGUAGE_MAP[code.toLowerCase()] || 'Unknown';
}

