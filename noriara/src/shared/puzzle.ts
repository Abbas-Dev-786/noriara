import { cyrb128, mulberry32 } from './seed';

export interface PuzzleShape {
  x: number;
  y: number;
  r: number;
}

export interface PuzzleLayout {
  id: string;
  targets: PuzzleShape[];
  hazards: PuzzleShape[];
}

export function generatePuzzlesForSeed(seed: string, count: number = 30): PuzzleLayout[] {
  const seedNum = cyrb128(seed);
  const random = mulberry32(seedNum);

  const puzzles: PuzzleLayout[] = [];

  for (let i = 0; i < count; i++) {
    const isTutorial = i === 0;
    const isEasy = i > 0 && i < 3;
    const isMedium = i >= 3 && i < 7;

    const targetCount = isTutorial ? 1 : isEasy ? 2 : isMedium ? 3 : 4;
    const hazardCount = isTutorial ? 0 : isEasy ? 0 : isMedium ? 2 : 4;

    const targets: PuzzleShape[] = [];
    const hazards: PuzzleShape[] = [];

    // Screen bounds 600x400
    // Keep elements somewhat centered
    const safeX = () => 150 + random() * 300;
    const safeY = () => 100 + random() * 200;

    for (let j = 0; j < targetCount; j++) {
      let x = safeX();
      let y = safeY();
      // Ensure targets aren't too close to each other
      while (targets.some(t => Math.hypot(t.x - x, t.y - y) < 60)) {
        x = safeX();
        y = safeY();
      }
      targets.push({ x, y, r: 25 });
    }

    for (let j = 0; j < hazardCount; j++) {
      let x = safeX();
      let y = safeY();
      // Ensure hazards aren't too close to targets or other hazards
      while (
        targets.some(t => Math.hypot(t.x - x, t.y - y) < 70) ||
        hazards.some(h => Math.hypot(h.x - x, h.y - y) < 60)
      ) {
        x = safeX();
        y = safeY();
      }
      hazards.push({ x, y, r: 20 + random() * 10 });
    }

    puzzles.push({
      id: `${seed}-${i}`,
      targets,
      hazards,
    });
  }

  return puzzles;
}

