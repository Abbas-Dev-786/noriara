export type DailySeed = string;

export function generateSeed(dateStr: string): DailySeed {
  return `seed-${dateStr}`;
}
