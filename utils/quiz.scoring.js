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
