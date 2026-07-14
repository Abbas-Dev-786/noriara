import { DifficultyBand, PuzzleArchetype } from './types';

// Current Generator Version
export const GENERATOR_VERSION = 2;

// Future Mechanic Sandbox - Disabled By Default
export const PROTOTYPE_MECHANICS_REGISTRY = {
  movingTargets: false,
  movingHazards: false,
  windField: false,
  gravityWell: false,
  portals: false,
};

export function getBand(index: number): DifficultyBand {
  if (index === 0) return 'tutorial';
  if (index >= 1 && index <= 2) return 'easy';
  if (index >= 3 && index <= 6) return 'medium';
  if (index >= 7 && index <= 14) return 'hard';
  return 'expert';
}

export type ArchetypeWeight = { item: PuzzleArchetype; weight: number };

export function getArchetypeWeights(band: DifficultyBand): ArchetypeWeight[] {
  if (band === 'tutorial') {
    return [{ item: 'open-sweep', weight: 1 }];
  } else if (band === 'easy') {
    return [
      { item: 'open-sweep', weight: 1 },
      { item: 'wide-sweep', weight: 1 },
    ];
  } else if (band === 'medium') {
    return [
      { item: 'wide-sweep', weight: 1 },
      { item: 'bounce-weave', weight: 1 },
      { item: 'tight-cluster', weight: 1 },
    ];
  } else if (band === 'hard') {
    return [
      { item: 'bounce-weave', weight: 1 },
      { item: 'hazard-orbit', weight: 1 },
      { item: 'delayed-catch', weight: 1 },
      { item: 'tight-cluster', weight: 1 },
    ];
  } else {
    // expert
    return [
      { item: 'open-sweep', weight: 1 },
      { item: 'wide-sweep', weight: 1 },
      { item: 'bounce-weave', weight: 2 },
      { item: 'hazard-orbit', weight: 3 },
      { item: 'delayed-catch', weight: 3 },
      { item: 'tight-cluster', weight: 2 },
    ];
  }
}
