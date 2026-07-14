import { cyrb128, mulberry32 } from './seed';
import { PuzzleLayout, PuzzleGenerationDiagnostics, DifficultyBand } from './puzzle/types';
import { getBand, getArchetypeWeights } from './puzzle/config';
import { validateLayout } from './puzzle/validation';
import { 
  ArchetypeBuilder, 
  pickRandom, 
  buildMeta, 
  buildOpenSweep, 
  buildWideSweep, 
  buildBounceWeave, 
  buildHazardOrbit, 
  buildDelayedCatch, 
  buildTightCluster 
} from './puzzle/builders';

export * from './puzzle/types';
export * from './puzzle/config';
export * from './puzzle/validation';

export function selectArchetype(rng: () => number, band: DifficultyBand): ArchetypeBuilder {
  const weights = getArchetypeWeights(band);
  const archetype = pickRandom(rng, weights);
  
  switch (archetype) {
    case 'open-sweep': return buildOpenSweep;
    case 'wide-sweep': return buildWideSweep;
    case 'bounce-weave': return buildBounceWeave;
    case 'hazard-orbit': return buildHazardOrbit;
    case 'delayed-catch': return buildDelayedCatch;
    case 'tight-cluster': return buildTightCluster;
  }
}

function generateDeterministicFallback(seed: string, index: number, band: DifficultyBand): PuzzleLayout {
  return {
    id: `${seed}-${index}-fallback`,
    targets: [{ x: 300, y: 200, r: 25 }],
    hazards: [],
    meta: {
      archetype: 'open-sweep',
      difficultyBand: band,
      mechanics: ['core'],
      generatorVersion: 2,
      bounceLikelihood: 0,
      densityScore: 0,
      targetCount: 1,
      hazardCount: 0,
    },
  };
}

export function generatePuzzlesForSeed(
  seed: string,
  count: number = 30,
  diagnostics?: PuzzleGenerationDiagnostics,
  isEvent: boolean = false
): PuzzleLayout[] {
  const seedNum = cyrb128(seed);
  const random = mulberry32(seedNum);

  const puzzles: PuzzleLayout[] = [];

  for (let i = 0; i < count; i++) {
    // Offset band calculation for events to start harder
    const bandIndex = isEvent ? i + 4 : i;
    const band = getBand(bandIndex);
    const builder = selectArchetype(random, band);
    let accepted = false;

    let retries = 0;
    const MAX_RETRIES = 500;
    
    while (!accepted && retries < MAX_RETRIES) {
      retries++;
      const candidate = builder(random, band, i);
      const validationIssue = validateLayout(candidate.targets, candidate.hazards, band, candidate.meta.archetype);

      if (!validationIssue) {
        const finalMeta = buildMeta(candidate.meta, candidate.targets, candidate.hazards);
        puzzles.push({
          id: `${seed}-${i}`,
          targets: candidate.targets,
          hazards: candidate.hazards,
          meta: finalMeta,
        });
        accepted = true;

        if (diagnostics) {
          diagnostics.totalGenerated++;
          diagnostics.archetypeDistribution[finalMeta.archetype] = (diagnostics.archetypeDistribution[finalMeta.archetype] || 0) + 1;
          diagnostics.bandDistribution[band] = (diagnostics.bandDistribution[band] || 0) + 1;
        }
      } else {
        if (diagnostics && validationIssue) {
          diagnostics.rejectionsByReason[validationIssue] = (diagnostics.rejectionsByReason[validationIssue] || 0) + 1;
        }
      }
    }

    if (!accepted) {
      puzzles.push(generateDeterministicFallback(seed, i, band));
      if (diagnostics) {
        diagnostics.fallbackCount++;
      }
    }
  }

  return puzzles;
}
