import { PuzzleShape, DifficultyBand, PuzzleLayoutMeta } from './types';
import { isHazardPlacementValid } from './validation';
import { GENERATOR_VERSION } from './config';

export type RandomFn = () => number;

export type ArchetypeBuilder = (rng: RandomFn, band: DifficultyBand, index: number) => {
  targets: PuzzleShape[];
  hazards: PuzzleShape[];
  meta: Omit<PuzzleLayoutMeta, 'targetCount' | 'hazardCount' | 'generatorVersion'>;
};

function randomRange(rng: RandomFn, min: number, max: number): number {
  return min + rng() * (max - min);
}

function randomInt(rng: RandomFn, min: number, max: number): number {
  return Math.floor(randomRange(rng, min, max + 1));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function pickRandom<T>(rng: RandomFn, items: { item: T; weight: number }[]): T {
  const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
  let val = rng() * totalWeight;
  for (const i of items) {
    if (val < i.weight) return i.item;
    val -= i.weight;
  }
  return items[items.length - 1]!.item;
}

export function buildMeta(
  meta: Omit<PuzzleLayoutMeta, 'targetCount' | 'hazardCount' | 'generatorVersion'>,
  targets: PuzzleShape[],
  hazards: PuzzleShape[]
): PuzzleLayoutMeta {
  return {
    ...meta,
    targetCount: targets.length,
    hazardCount: hazards.length,
    generatorVersion: GENERATOR_VERSION,
  };
}

function addRandomValidHazard(
  rng: RandomFn,
  targets: PuzzleShape[],
  hazards: PuzzleShape[],
  options: {
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
    rMin: number;
    rMax: number;
    attempts?: number;
  }
): boolean {
  const attempts = options.attempts ?? 40;
  for (let i = 0; i < attempts; i++) {
    const hazard = {
      x: randomRange(rng, options.xMin, options.xMax),
      y: randomRange(rng, options.yMin, options.yMax),
      r: randomRange(rng, options.rMin, options.rMax),
    };
    if (isHazardPlacementValid(hazard, targets, hazards)) {
      hazards.push(hazard);
      return true;
    }
  }
  return false;
}

function addValidHazardNear(
  targets: PuzzleShape[],
  hazards: PuzzleShape[],
  base: PuzzleShape,
  candidateOffsets: Array<{ dx: number; dy: number }>,
  radius: number
): boolean {
  for (const offset of candidateOffsets) {
    const hazard = {
      x: clamp(base.x + offset.dx, 100, 500),
      y: clamp(base.y + offset.dy, 90, 310),
      r: radius,
    };
    if (isHazardPlacementValid(hazard, targets, hazards)) {
      hazards.push(hazard);
      return true;
    }
  }
  return false;
}

export const buildOpenSweep: ArchetypeBuilder = (rng, band, _index) => {
  const targetCount = band === 'tutorial' ? 1 : band === 'easy' ? 2 : 3;
  const hazardCount = band === 'tutorial' || band === 'easy' ? 0 : band === 'medium' ? 1 : 2;
  const targets: PuzzleShape[] = [];
  const hazards: PuzzleShape[] = [];

  for (let i = 0; i < targetCount; i++) {
    targets.push({
      x: randomRange(rng, 100, 500),
      y: randomRange(rng, 100, 300),
      r: randomRange(rng, 22, 26),
    });
  }

  for (let i = 0; i < hazardCount; i++) {
    addRandomValidHazard(rng, targets, hazards, {
      xMin: 150,
      xMax: 450,
      yMin: 120,
      yMax: 280,
      rMin: 18,
      rMax: 30,
    });
  }

  return {
    targets,
    hazards,
    meta: {
      archetype: 'open-sweep',
      difficultyBand: band,
      mechanics: ['core'],
      bounceLikelihood: 0.1,
      densityScore: 0.2,
    },
  };
};

export const buildBounceWeave: ArchetypeBuilder = (rng, band, _index) => {
  const targetCount = band === 'medium' ? 3 : randomInt(rng, 3, 4);
  const requestedHazardCount = band === 'medium' ? 0 : randomInt(rng, 1, 2);
  const targets: PuzzleShape[] = [];
  const hazards: PuzzleShape[] = [];

  const maxStepByWidth = targetCount > 1 ? (520 - 80 - 40) / (targetCount - 1) : 110;
  const step = randomRange(rng, 50, Math.min(100, maxStepByWidth));
  const dir = rng() > 0.5 ? 1 : -1;
  const startY = rng() > 0.5 ? 'upper' : 'lower';
  const span = step * (targetCount - 1);
  let x =
    dir === 1
      ? randomRange(rng, 80, 520 - span)
      : randomRange(rng, 80 + span, 520);

  for (let i = 0; i < targetCount; i++) {
    const isUpper = startY === 'upper' ? i % 2 === 0 : i % 2 !== 0;
    const y = isUpper ? randomRange(rng, 85, 135) : randomRange(rng, 265, 315);
    targets.push({ x: clamp(x, 80, 520), y, r: randomRange(rng, 22, 26) });
    x += dir * step;
  }

  if (requestedHazardCount > 0 && targets.length >= 2) {
    const midpoint = {
      x: (targets[0]!.x + targets[1]!.x) / 2,
      y: 200,
      r: randomRange(rng, 20, 26),
    };
    addValidHazardNear(
      targets,
      hazards,
      midpoint,
      [
        { dx: 0, dy: 0 },
        { dx: 34, dy: 0 },
        { dx: -34, dy: 0 },
        { dx: 0, dy: 34 },
        { dx: 0, dy: -34 },
      ],
      midpoint.r
    );
  }

  if (requestedHazardCount > 1 && targets.length >= 4) {
    const midpoint = {
      x: (targets[2]!.x + targets[3]!.x) / 2,
      y: 200,
      r: randomRange(rng, 18, 22),
    };
    addValidHazardNear(
      targets,
      hazards,
      midpoint,
      [
        { dx: 0, dy: 0 },
        { dx: 34, dy: 0 },
        { dx: -34, dy: 0 },
        { dx: 0, dy: 34 },
        { dx: 0, dy: -34 },
      ],
      midpoint.r
    );
  }

  return {
    targets,
    hazards,
    meta: {
      archetype: 'bounce-weave',
      difficultyBand: band,
      mechanics: ['core'],
      bounceLikelihood: 0.8,
      densityScore: 0.5,
    },
  };
};

export const buildHazardOrbit: ArchetypeBuilder = (rng, band, _index) => {
  const targetCount = band === 'hard' ? 3 : randomInt(rng, 3, 4);
  const hazardCount = band === 'hard' ? 1 : randomInt(rng, 1, 2);
  const targets: PuzzleShape[] = [];
  const hazards: PuzzleShape[] = [];

  const hx = randomRange(rng, 265, 335);
  const hy = randomRange(rng, 180, 220);
  hazards.push({ x: hx, y: hy, r: randomRange(rng, 24, 30) });

  if (hazardCount > 1) {
    const secondaryAngle = rng() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
    const secondaryDistance = randomRange(rng, 58, 72);
    const secondaryHazard = {
      x: clamp(hx + Math.cos(secondaryAngle) * secondaryDistance, 100, 500),
      y: clamp(hy + Math.sin(secondaryAngle) * secondaryDistance, 90, 310),
      r: randomRange(rng, 18, 22),
    };
    hazards.push(secondaryHazard);
  }

  const gapCenter = randomRange(rng, 0, Math.PI * 2);
  const gapWidth = randomRange(rng, 0.8, 1.35);
  const arcSpan = randomRange(rng, Math.PI * 0.9, Math.PI * 1.35);
  const baseAngle = gapCenter + gapWidth / 2;
  const angleStep = arcSpan / (targetCount - 1);
  const orbitRadius = randomRange(rng, 58, 70);

  for (let i = 0; i < targetCount; i++) {
    const angle = baseAngle + i * angleStep;
    targets.push({
      x: clamp(hx + Math.cos(angle) * orbitRadius, 80, 520),
      y: clamp(hy + Math.sin(angle) * orbitRadius, 70, 330),
      r: randomRange(rng, 22, 26),
    });
  }

  return {
    targets,
    hazards,
    meta: {
      archetype: 'hazard-orbit',
      difficultyBand: band,
      mechanics: ['core'],
      bounceLikelihood: 0.4,
      densityScore: 0.7,
    },
  };
};

export const buildDelayedCatch: ArchetypeBuilder = (rng, band, _index) => {
  const earlyCount = band === 'hard' ? 2 : randomInt(rng, 2, 3);
  const hazardCount = band === 'hard' ? randomInt(rng, 0, 1) : randomInt(rng, 1, 2);
  const targets: PuzzleShape[] = [];
  const hazards: PuzzleShape[] = [];

  let ex = randomRange(rng, 100, 200);
  for (let i = 0; i < earlyCount; i++) {
    targets.push({
      x: ex,
      y: randomRange(rng, 150, 250),
      r: randomRange(rng, 22, 26),
    });
    ex += randomRange(rng, 60, 90);
  }

  targets.push({
    x: randomRange(rng, 390, 510),
    y: rng() > 0.5 ? randomRange(rng, 80, 120) : randomRange(rng, 280, 320),
    r: randomRange(rng, 22, 26),
  });

  for (let i = 0; i < hazardCount; i++) {
    addRandomValidHazard(rng, targets, hazards, {
      xMin: 250,
      xMax: 350,
      yMin: 150,
      yMax: 250,
      rMin: 20,
      rMax: 25,
      attempts: 60,
    });
  }

  return {
    targets,
    hazards,
    meta: {
      archetype: 'delayed-catch',
      difficultyBand: band,
      mechanics: ['core'],
      bounceLikelihood: 0.6,
      densityScore: 0.6,
    },
  };
};

export const buildWideSweep: ArchetypeBuilder = (rng, band, _index) => {
  const targetCount =
    band === 'easy' ? 2 : band === 'medium' ? randomInt(rng, 3, 4) : randomInt(rng, 3, 5);
  const hazardCount =
    band === 'easy' ? 0 : band === 'medium' ? randomInt(rng, 0, 1) : randomInt(rng, 0, 2);
  const targets: PuzzleShape[] = [];
  const hazards: PuzzleShape[] = [];

  const minX = randomRange(rng, 120, 160);
  const maxX = minX + randomRange(rng, 220, 260);
  const baseY = randomRange(rng, 150, 250);
  const ySpread = randomRange(rng, 40, 80);

  targets.push({ x: minX, y: baseY + randomRange(rng, -ySpread/2, ySpread/2), r: randomRange(rng, 22, 26) });
  for (let i = 1; i < targetCount - 1; i++) {
    targets.push({
      x: minX + (maxX - minX) * (i / (targetCount - 1)),
      y: baseY + randomRange(rng, -ySpread/2, ySpread/2),
      r: randomRange(rng, 22, 26),
    });
  }
  targets.push({ x: maxX, y: baseY + randomRange(rng, -ySpread/2, ySpread/2), r: randomRange(rng, 22, 26) });

  for (let i = 0; i < hazardCount; i++) {
    addRandomValidHazard(rng, targets, hazards, {
      xMin: minX + 50,
      xMax: maxX - 50,
      yMin: clamp(baseY - 90, 90, 310),
      yMax: clamp(baseY + 90, 90, 310),
      rMin: 18,
      rMax: 30,
      attempts: 50,
    });
  }

  return {
    targets,
    hazards,
    meta: {
      archetype: 'wide-sweep',
      difficultyBand: band,
      mechanics: ['core'],
      bounceLikelihood: 0.2,
      densityScore: 0.3,
    },
  };
};

export const buildTightCluster: ArchetypeBuilder = (rng, band, _index) => {
  const targetCount = band === 'medium' ? 3 : randomInt(rng, 3, 4);
  const hazardCount = band === 'medium' ? 1 : randomInt(rng, 1, 3);
  const targets: PuzzleShape[] = [];
  const hazards: PuzzleShape[] = [];

  const cx = randomRange(rng, 275, 325);
  const cy = randomRange(rng, 180, 220);
  const clusterR = randomRange(rng, 40, 58);
  const baseAngle = randomRange(rng, 0, Math.PI * 2);

  for (let i = 0; i < targetCount; i++) {
    const angle = baseAngle + (i * Math.PI * 2) / targetCount + randomRange(rng, -0.25, 0.25);
    const dist = randomRange(rng, 24, clusterR);
    targets.push({
      x: clamp(cx + Math.cos(angle) * dist, 80, 520),
      y: clamp(cy + Math.sin(angle) * dist, 70, 330),
      r: randomRange(rng, 22, 26),
    });
  }

  for (let i = 0; i < hazardCount; i++) {
    const angle = baseAngle + (i * Math.PI * 2) / Math.max(1, hazardCount) + randomRange(rng, -0.2, 0.2);
    const dist = clusterR + randomRange(rng, 38, 52);
    const anchor = {
      x: clamp(cx + Math.cos(angle) * dist, 100, 500),
      y: clamp(cy + Math.sin(angle) * dist, 90, 310),
      r: randomRange(rng, 18, 25),
    };
    addValidHazardNear(
      targets,
      hazards,
      anchor,
      [
        { dx: 0, dy: 0 },
        { dx: 16, dy: 0 },
        { dx: -16, dy: 0 },
        { dx: 0, dy: 16 },
        { dx: 0, dy: -16 },
        { dx: 24, dy: 24 },
        { dx: -24, dy: -24 },
      ],
      anchor.r
    );
  }

  return {
    targets,
    hazards,
    meta: {
      archetype: 'tight-cluster',
      difficultyBand: band,
      mechanics: ['core'],
      bounceLikelihood: 0.4,
      densityScore: 0.9,
    },
  };
};
