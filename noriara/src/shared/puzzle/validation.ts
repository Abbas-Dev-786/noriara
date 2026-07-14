import { PuzzleShape, DifficultyBand, PuzzleArchetype } from './types';

export function isHazardPlacementValid(
  hazard: PuzzleShape,
  targets: PuzzleShape[],
  hazards: PuzzleShape[]
): boolean {
  if (hazard.x < 100 || hazard.x > 500 || hazard.y < 90 || hazard.y > 310) {
    return false;
  }

  for (const target of targets) {
    if (Math.hypot(target.x - hazard.x, target.y - hazard.y) < target.r + hazard.r + 18) {
      return false;
    }
  }

  for (const existingHazard of hazards) {
    if (Math.hypot(existingHazard.x - hazard.x, existingHazard.y - hazard.y) < existingHazard.r + hazard.r + 20) {
      return false;
    }
  }

  return true;
}

export function validateLayout(
  targets: PuzzleShape[],
  hazards: PuzzleShape[],
  band: DifficultyBand,
  archetype: PuzzleArchetype
): string | null {
  for (const t of targets) {
    if (t.x < 80 || t.x > 520 || t.y < 70 || t.y > 330) return 'target_out_of_bounds';
  }
  for (const h of hazards) {
    if (h.x < 100 || h.x > 500 || h.y < 90 || h.y > 310) return 'hazard_out_of_bounds';
  }

  for (let i = 0; i < targets.length; i++) {
    for (let j = i + 1; j < targets.length; j++) {
      const d = Math.hypot(targets[i]!.x - targets[j]!.x, targets[i]!.y - targets[j]!.y);
      if (d < 56) return 'target_target_too_close';
    }
  }

  for (const t of targets) {
    for (const h of hazards) {
      const d = Math.hypot(t.x - h.x, t.y - h.y);
      if (d < t.r + h.r + 18) return 'target_hazard_too_close';
    }
  }

  for (let i = 0; i < hazards.length; i++) {
    for (let j = i + 1; j < hazards.length; j++) {
      const d = Math.hypot(hazards[i]!.x - hazards[j]!.x, hazards[i]!.y - hazards[j]!.y);
      if (d < hazards[i]!.r + hazards[j]!.r + 20) return 'hazard_hazard_too_close';
    }
  }

  if (band === 'tutorial') {
    if (targets.length !== 1 || hazards.length > 0) return 'tutorial_must_be_simple';
  }

  if (band === 'easy') {
    if (targets.length > 2 || hazards.length > 0) return 'easy_band_too_complex';
  }

  if (band === 'medium') {
    if (targets.length > 4 || hazards.length > 1) return 'medium_band_too_complex';
  }

  if (archetype === 'bounce-weave') {
    let hasBigVerticalSeparation = false;
    for (let i = 0; i < targets.length - 1; i++) {
      if (Math.abs(targets[i]!.y - targets[i + 1]!.y) >= 120) {
        hasBigVerticalSeparation = true;
        break;
      }
    }
    if (!hasBigVerticalSeparation) return 'bounce_weave_not_vertical_enough';
  }

  if (archetype === 'wide-sweep') {
    const xs = targets.map(t => t.x);
    if (Math.max(...xs) - Math.min(...xs) < 220) return 'wide_sweep_too_narrow';
  }

  if (archetype === 'hazard-orbit') {
    if (hazards.length === 0 || targets.length < 3) return 'hazard_orbit_missing_core_geometry';
    const primaryHazard = hazards[0]!;
    const angles = targets
      .map((target) => {
        let angle = Math.atan2(target.y - primaryHazard.y, target.x - primaryHazard.x);
        if (angle < 0) angle += Math.PI * 2;
        return angle;
      })
      .sort((a, b) => a - b);
    const wrappedAngles = [...angles, angles[0]! + Math.PI * 2];
    let maxGap = 0;
    for (let i = 0; i < wrappedAngles.length - 1; i++) {
      maxGap = Math.max(maxGap, wrappedAngles[i + 1]! - wrappedAngles[i]!);
    }
    if (maxGap < 0.7) return 'hazard_orbit_missing_entry_lane';

    const distances = targets.map((target) => Math.hypot(target.x - primaryHazard.x, target.y - primaryHazard.y));
    const minDistance = Math.min(...distances);
    const maxDistance = Math.max(...distances);
    if (maxDistance - minDistance > 40) return 'hazard_orbit_radius_too_irregular';
  }

  if (archetype === 'delayed-catch') {
    const xs = targets.map((target) => target.x);
    const rightmostTarget = Math.max(...xs);
    const leftmostTarget = Math.min(...xs);
    const sortedTargets = [...targets].sort((a, b) => a.x - b.x);
    const delayedTarget = sortedTargets[sortedTargets.length - 1]!;
    if (rightmostTarget - leftmostTarget < 180) return 'delayed_catch_not_far_enough';

    const earlyTargets = sortedTargets.slice(0, -1);
    const averageEarlyX = earlyTargets.reduce((sum, target) => sum + target.x, 0) / earlyTargets.length;
    if (delayedTarget.x - averageEarlyX < 140) return 'delayed_catch_not_distinct_enough';
  }

  if (archetype === 'tight-cluster') {
    if (targets.length < 3) return 'tight_cluster_missing_target_cluster';
    const clusterCenter = {
      x: targets.reduce((sum, target) => sum + target.x, 0) / targets.length,
      y: targets.reduce((sum, target) => sum + target.y, 0) / targets.length,
    };
    const maxClusterDistance = Math.max(
      ...targets.map((target) => Math.hypot(target.x - clusterCenter.x, target.y - clusterCenter.y))
    );
    if (maxClusterDistance > 80) return 'tight_cluster_too_spread';

    for (const hazard of hazards) {
      for (const target of targets) {
        const distance = Math.hypot(target.x - hazard.x, target.y - hazard.y);
        const edgeGap = distance - target.r - hazard.r;
        if (edgeGap <= 10) return 'tight_cluster_hazard_readability_too_low';
      }
    }
  }

  return null;
}
