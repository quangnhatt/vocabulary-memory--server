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

export function calculateDeltaCS({ quizRatio, difficultyPressure, currentCS }) {
  const raw = (quizRatio - BASELINE) * difficultyPressure * K;

  const clamped = clamp(raw, -MAX_DELTA, MAX_DELTA);

  const resistance = 1 + Math.pow(currentCS / 1000, 2);

  return clamped / resistance;
}

/**
 * Calculate score for a correct match
 *
 * @param {number} combo - current combo streak (>=1)
 * @param {string} difficulty - EASY | MEDIUM | HARD
 */
const baseScoreMap = {
  EASY: 10,
  MEDIUM: 15,
  HARD: 20,
};

export function calculateScore({
  combo = 1,
  star = 0,
  difficulty = "EASY",
  correct = true,
}) {
  let score = 0;

  // Base score by difficulty
  const base = baseScoreMap[difficulty] ?? 10;
  if (!correct) {
    // penalty
    score = -(base / 5);
    return score;
  }

  // Combo multiplier
  // (caps to prevent abuse)
  const comboMultiplier = Math.min(1 + combo, 5); // max x3

  // Speed will be adjusted later
  const speedMultiplier = 1;

  // Star points
  const starScore = star * 5;

  // Final score
  score = Math.round(base * comboMultiplier * speedMultiplier);

  return score;
}

export function calculateGainStar({ combo = 1, correct = true }) {
  let star = 0;

  // Base score by difficulty
  if (!correct) {
    // penalty
    return 0;
  }
  if (combo != 0 && combo % 5 == 0) {
    star += 1;
  }

  return star;
}

export function calculateExp(player, opponent) {
  const MAX_EXP = 10;
  const MIN_EXP = 2;
  const MIN_SCORE_REQUIRED = 2; // 

  if (player.score < MIN_SCORE_REQUIRED) {
    return 0;
  }

  // Win / Lose
  const isWin = player.score > opponent.score;
  const isDraw = player.score === opponent.score;

  let baseExp = 0;
  if (isWin) {
    baseExp = 6;
  } else if (isDraw) baseExp = 5;
  else {
    baseExp = 4;
  }

  // Score difference factor (close games = more EXP)
  const scoreDiff = Math.abs(player.score - opponent.score);

  // Expected competitive range: 0–200
  // The bigger diff score, the less exp earned?
  let diffFactor = 1 - scoreDiff / 200;
  diffFactor = Math.max(0.3, Math.min(1, diffFactor));

  // Performance bonuses
  const starBonus = Math.min(player.star, 4) * 0.5; // max 2
  const comboBonus = Math.min(player.maxCombo, 5) * 0.3; // max 1.5


  // Scale EXP up after minimum score
  const scoreFactor = Math.min(1, player.score / 50);


  // Final EXP
  const rawExp = (baseExp + starBonus + comboBonus) * diffFactor * scoreFactor;
  const finalExp = Math.round(rawExp);

  return Math.max(MIN_EXP, Math.min(MAX_EXP, finalExp));
}
