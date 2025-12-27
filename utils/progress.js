export function confidenceToProgress(cs) {
  if (cs < 100) return cs / 10;                 // 0–10
  if (cs < 300) return 10 + (cs - 100) / 10;    // 10–30
  if (cs < 500) return 30 + (cs - 300) / 10;    // 30–50
  if (cs < 700) return 50 + (cs - 500) / 10;    // 50–70
  if (cs < 900) return 70 + (cs - 700) / 10;    // 70–90
  return 90 + (cs - 900) / 10;                  // 90–100
}