
export const USER_LEVELS = [
  { key: 'Explorer', min: 0, max: 100 },
  { key: 'Builder', min: 100, max: 300 },
  { key: 'Confident', min: 300, max: 500 },
  { key: 'Fluent', min: 500, max: 700 },
  { key: 'Near-Native', min: 700, max: 900 },
  { key: 'Native-like', min: 900, max: 1000 },
];


export function resolveLevel(cs) {
  if (cs < 100) return "Explorer";
  if (cs < 300) return "Builder";
  if (cs < 500) return "Confident";
  if (cs < 700) return "Fluent";
  if (cs < 900) return "Near-Native";
  return "Native-like";
}

export function progressPercent(cs) {
  if (cs < 100) return (cs / 100) * 10;
  if (cs < 300) return 10 + ((cs - 100) / 200) * 20;
  if (cs < 500) return 30 + ((cs - 300) / 200) * 20;
  if (cs < 700) return 50 + ((cs - 500) / 200) * 20;
  if (cs < 900) return 70 + ((cs - 700) / 200) * 20;
  return 90 + ((cs - 900) / 100) * 10;
}

export function nextLevel(level) {
  const idx = USER_LEVELS.findIndex(x => x.key === level);
  return USER_LEVELS[Math.min(idx + 1, USER_LEVELS.length - 1)];
}

export function pointsToNextLevel(cs) {
  if (cs < 100) return 100 - cs;
  if (cs < 300) return 300 - cs;
  if (cs < 500) return 500 - cs;
  if (cs < 700) return 700 - cs;
  if (cs < 900) return 900 - cs;
  return 0;
}
