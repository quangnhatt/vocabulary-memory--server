import { POPULARITY_LABELS } from '../common/constants.js';

export const DEFAULT_POPULARITY_SCORE = {
  [POPULARITY_LABELS.VERY_COMMON]: 0.95,
  [POPULARITY_LABELS.COMMON]: 0.85,
  [POPULARITY_LABELS.FREQUENT]: 0.65,
  [POPULARITY_LABELS.UNCOMMON]: 0.35,
  [POPULARITY_LABELS.RARE]: 0.15
};

export function getPopularity(score) {
    if (score >= 0.9) return POPULARITY_LABELS.VERY_COMMON; 
    if (score >= 0.7) return POPULARITY_LABELS.COMMON;
    if (score >= 0.5) return POPULARITY_LABELS.FREQUENT;
    if (score >= 0.3) return POPULARITY_LABELS.UNCOMMON;
    return POPULARITY_LABELS.RARE;
}