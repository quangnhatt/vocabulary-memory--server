const BASELINE = 0.6;
const K = 18;
const MAX_DELTA = 6;

export function clamp(x, min, max) {
  return Math.min(Math.max(x, min), max);
}

export function inverseSkillMultiplier(cs) {
  const skill = cs / 1000;
  return clamp(1.2 - skill, 0.3, 1.2);
}

export function calculateDeltaCS({
  quizRatio,
  difficultyPressure,
  currentCS
}) {
  const raw =
    (quizRatio - BASELINE) * difficultyPressure * K;

  const clamped = clamp(raw, -MAX_DELTA, MAX_DELTA);

  const resistance = 1 + Math.pow(currentCS / 1000, 2);

  return clamped / resistance;
}


/**
 * Calculate score for a correct match
 *
 * @param {number} combo - current combo streak (>=1)
 * @param {number} timeLeft - seconds remaining
 * @param {string} difficulty - EASY | MEDIUM | HARD
 */
export function calculateScore({
  combo = 1,
  timeLeft = 0,
  difficulty = 'EASY',
}) {
  // -----------------------
  // Base score by difficulty
  // -----------------------
  const baseScoreMap = {
    EASY: 10,
    MEDIUM: 15,
    HARD: 20,
  };

  const base = baseScoreMap[difficulty] ?? 10;

  // -----------------------
  // Combo multiplier
  // (caps to prevent abuse)
  // -----------------------
  const comboMultiplier = Math.min(1 + combo * 0.2, 3); // max x3

  // -----------------------
  // Speed bonus
  // -----------------------
  let speedMultiplier = 1;
  if (timeLeft >= 40) speedMultiplier = 1.3;
  else if (timeLeft >= 20) speedMultiplier = 1.15;

  // -----------------------
  // Final score
  // -----------------------
  const score = Math.round(
    base * comboMultiplier * speedMultiplier
  );

  return score;
}