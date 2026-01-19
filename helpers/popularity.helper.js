import { POPULARITY_LABELS } from '../common/constants.js';

export const DEFAULT_POPULARITY_SCORE = {
  [POPULARITY_LABELS.VERY_EASY]: 0.95,
  [POPULARITY_LABELS.EASY]: 0.85,
  [POPULARITY_LABELS.MEDIUM]: 0.7,
  [POPULARITY_LABELS.HARD]: 0.5,
  [POPULARITY_LABELS.VERY_HARD]: 0.3
};

export function getPopularity(score) {
    if (score >= 0.9) return POPULARITY_LABELS.VERY_EASY; 
    if (score >= 0.8) return POPULARITY_LABELS.EASY;
    if (score >= 0.6) return POPULARITY_LABELS.MEDIUM;
    if (score >= 0.4) return POPULARITY_LABELS.HARD;
    return POPULARITY_LABELS.VERY_HARD;
}