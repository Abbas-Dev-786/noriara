export type PuzzleType = 'connect' | 'collect' | 'avoid';

export interface PuzzlePoint {
  x: number;
  y: number;
}

export interface PuzzleLayout {
  id: string;
  type: PuzzleType;
  points: PuzzlePoint[];
}

export function generatePuzzlesForSeed(seed: string): PuzzleLayout[] {
  return seed ? [] : [];
}
