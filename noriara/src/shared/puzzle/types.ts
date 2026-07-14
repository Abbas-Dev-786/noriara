export interface PuzzleShape {
  x: number;
  y: number;
  r: number;
}

export type PuzzleArchetype =
  | 'open-sweep'
  | 'wide-sweep'
  | 'bounce-weave'
  | 'hazard-orbit'
  | 'delayed-catch'
  | 'tight-cluster';

export type DifficultyBand = 'tutorial' | 'easy' | 'medium' | 'hard' | 'expert';
export type PuzzleMechanic = 'core' | 'movingTargets' | 'movingHazards' | 'windField' | 'gravityWell' | 'portals';

export interface PuzzleLayoutMeta {
  archetype: PuzzleArchetype;
  difficultyBand: DifficultyBand;
  mechanics: PuzzleMechanic[];
  generatorVersion: number;
  bounceLikelihood: number;
  densityScore: number;
  targetCount: number;
  hazardCount: number;
}

export interface PuzzleLayout {
  id: string;
  targets: PuzzleShape[];
  hazards: PuzzleShape[];
  meta?: PuzzleLayoutMeta;
}

export interface LayoutValidationIssue {
  reason: string;
}

export interface PuzzleGenerationDiagnostics {
  totalGenerated: number;
  rejectionsByReason: Record<string, number>;
  fallbackCount: number;
  archetypeDistribution: Record<string, number>;
  bandDistribution: Record<string, number>;
}
