export type DailySeed = string;

/** Generates a simple date-based seed string */
export function generateSeed(dateStr: string): DailySeed {
  return `seed-${dateStr}`;
}

/** 
 * Mulberry32 PRNG
 * @param a numeric seed
 * @returns a function that returns deterministic random numbers between 0 and 1
 */
export function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash string to 32-bit integer for the seed
 */
export function cyrb128(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h;
}
