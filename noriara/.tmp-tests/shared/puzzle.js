import { cyrb128, mulberry32 } from './seed.js';
// Future Mechanic Sandbox - Disabled By Default
export const PROTOTYPE_MECHANICS_REGISTRY = {
    movingTargets: false,
    movingHazards: false,
    windField: false,
    gravityWell: false,
    portals: false,
};
function getBand(index) {
    if (index === 0)
        return 'tutorial';
    if (index >= 1 && index <= 2)
        return 'easy';
    if (index >= 3 && index <= 6)
        return 'medium';
    if (index >= 7 && index <= 14)
        return 'hard';
    return 'expert';
}
function randomRange(rng, min, max) {
    return min + rng() * (max - min);
}
function randomInt(rng, min, max) {
    return Math.floor(randomRange(rng, min, max + 1));
}
function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
function pickRandom(rng, items) {
    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    let val = rng() * totalWeight;
    for (const i of items) {
        if (val < i.weight)
            return i.item;
        val -= i.weight;
    }
    return items[items.length - 1].item;
}
function buildMeta(meta, targets, hazards) {
    return {
        ...meta,
        targetCount: targets.length,
        hazardCount: hazards.length,
    };
}
function isHazardPlacementValid(hazard, targets, hazards) {
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
function addRandomValidHazard(rng, targets, hazards, options) {
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
function addValidHazardNear(targets, hazards, base, candidateOffsets, radius) {
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
const buildOpenSweep = (rng, band, _index) => {
    const targetCount = band === 'tutorial' ? 1 : band === 'easy' ? 2 : 3;
    const hazardCount = band === 'tutorial' || band === 'easy' ? 0 : band === 'medium' ? 1 : 2;
    const targets = [];
    const hazards = [];
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
const buildBounceWeave = (rng, band, _index) => {
    const targetCount = band === 'medium' ? 3 : randomInt(rng, 3, 4);
    const requestedHazardCount = band === 'medium' ? 0 : randomInt(rng, 1, 2);
    const targets = [];
    const hazards = [];
    const maxStepByWidth = targetCount > 1 ? (520 - 80 - 40) / (targetCount - 1) : 110;
    const step = randomRange(rng, 50, Math.min(100, maxStepByWidth));
    const dir = rng() > 0.5 ? 1 : -1;
    const startY = rng() > 0.5 ? 'upper' : 'lower';
    const span = step * (targetCount - 1);
    let x = dir === 1
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
            x: (targets[0].x + targets[1].x) / 2,
            y: 200,
            r: randomRange(rng, 20, 26),
        };
        addValidHazardNear(targets, hazards, midpoint, [
            { dx: 0, dy: 0 },
            { dx: 34, dy: 0 },
            { dx: -34, dy: 0 },
            { dx: 0, dy: 34 },
            { dx: 0, dy: -34 },
        ], midpoint.r);
    }
    if (requestedHazardCount > 1 && targets.length >= 4) {
        const midpoint = {
            x: (targets[2].x + targets[3].x) / 2,
            y: 200,
            r: randomRange(rng, 18, 22),
        };
        addValidHazardNear(targets, hazards, midpoint, [
            { dx: 0, dy: 0 },
            { dx: 34, dy: 0 },
            { dx: -34, dy: 0 },
            { dx: 0, dy: 34 },
            { dx: 0, dy: -34 },
        ], midpoint.r);
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
const buildHazardOrbit = (rng, band, _index) => {
    const targetCount = band === 'hard' ? 3 : randomInt(rng, 3, 4);
    const hazardCount = band === 'hard' ? 1 : randomInt(rng, 1, 2);
    const targets = [];
    const hazards = [];
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
const buildDelayedCatch = (rng, band, _index) => {
    const earlyCount = band === 'hard' ? 2 : randomInt(rng, 2, 3);
    const hazardCount = band === 'hard' ? randomInt(rng, 0, 1) : randomInt(rng, 1, 2);
    const targets = [];
    const hazards = [];
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
const buildWideSweep = (rng, band, _index) => {
    const targetCount = band === 'easy' ? 2 : band === 'medium' ? randomInt(rng, 3, 4) : randomInt(rng, 3, 5);
    const hazardCount = band === 'easy' ? 0 : band === 'medium' ? randomInt(rng, 0, 1) : randomInt(rng, 0, 2);
    const targets = [];
    const hazards = [];
    const minX = randomRange(rng, 120, 160);
    const maxX = minX + randomRange(rng, 220, 260);
    const baseY = randomRange(rng, 150, 250);
    const ySpread = randomRange(rng, 40, 80);
    targets.push({ x: minX, y: baseY + randomRange(rng, -ySpread / 2, ySpread / 2), r: randomRange(rng, 22, 26) });
    for (let i = 1; i < targetCount - 1; i++) {
        targets.push({
            x: minX + (maxX - minX) * (i / (targetCount - 1)),
            y: baseY + randomRange(rng, -ySpread / 2, ySpread / 2),
            r: randomRange(rng, 22, 26),
        });
    }
    targets.push({ x: maxX, y: baseY + randomRange(rng, -ySpread / 2, ySpread / 2), r: randomRange(rng, 22, 26) });
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
const buildTightCluster = (rng, band, _index) => {
    const targetCount = band === 'medium' ? 3 : randomInt(rng, 3, 4);
    const hazardCount = band === 'medium' ? 1 : randomInt(rng, 1, 3);
    const targets = [];
    const hazards = [];
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
        addValidHazardNear(targets, hazards, anchor, [
            { dx: 0, dy: 0 },
            { dx: 16, dy: 0 },
            { dx: -16, dy: 0 },
            { dx: 0, dy: 16 },
            { dx: 0, dy: -16 },
            { dx: 24, dy: 24 },
            { dx: -24, dy: -24 },
        ], anchor.r);
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
function selectArchetype(rng, band) {
    if (band === 'tutorial') {
        return buildOpenSweep;
    }
    else if (band === 'easy') {
        return pickRandom(rng, [
            { item: buildOpenSweep, weight: 1 },
            { item: buildWideSweep, weight: 1 },
        ]);
    }
    else if (band === 'medium') {
        return pickRandom(rng, [
            { item: buildWideSweep, weight: 1 },
            { item: buildBounceWeave, weight: 1 },
            { item: buildTightCluster, weight: 1 },
        ]);
    }
    else if (band === 'hard') {
        return pickRandom(rng, [
            { item: buildBounceWeave, weight: 1 },
            { item: buildHazardOrbit, weight: 1 },
            { item: buildDelayedCatch, weight: 1 },
            { item: buildTightCluster, weight: 1 },
        ]);
    }
    else {
        // expert
        return pickRandom(rng, [
            { item: buildOpenSweep, weight: 1 },
            { item: buildWideSweep, weight: 1 },
            { item: buildBounceWeave, weight: 2 },
            { item: buildHazardOrbit, weight: 3 },
            { item: buildDelayedCatch, weight: 3 },
            { item: buildTightCluster, weight: 2 },
        ]);
    }
}
function validateLayout(targets, hazards, band, archetype) {
    for (const t of targets) {
        if (t.x < 80 || t.x > 520 || t.y < 70 || t.y > 330)
            return 'target_out_of_bounds';
    }
    for (const h of hazards) {
        if (h.x < 100 || h.x > 500 || h.y < 90 || h.y > 310)
            return 'hazard_out_of_bounds';
    }
    for (let i = 0; i < targets.length; i++) {
        for (let j = i + 1; j < targets.length; j++) {
            const d = Math.hypot(targets[i].x - targets[j].x, targets[i].y - targets[j].y);
            if (d < 56)
                return 'target_target_too_close';
        }
    }
    for (const t of targets) {
        for (const h of hazards) {
            const d = Math.hypot(t.x - h.x, t.y - h.y);
            if (d < t.r + h.r + 18)
                return 'target_hazard_too_close';
        }
    }
    for (let i = 0; i < hazards.length; i++) {
        for (let j = i + 1; j < hazards.length; j++) {
            const d = Math.hypot(hazards[i].x - hazards[j].x, hazards[i].y - hazards[j].y);
            if (d < hazards[i].r + hazards[j].r + 20)
                return 'hazard_hazard_too_close';
        }
    }
    if (band === 'tutorial') {
        if (targets.length !== 1 || hazards.length > 0)
            return 'tutorial_must_be_simple';
    }
    if (band === 'easy') {
        if (targets.length > 2 || hazards.length > 0)
            return 'easy_band_too_complex';
    }
    if (band === 'medium') {
        if (targets.length > 4 || hazards.length > 1)
            return 'medium_band_too_complex';
    }
    if (archetype === 'bounce-weave') {
        let hasBigVerticalSeparation = false;
        for (let i = 0; i < targets.length - 1; i++) {
            if (Math.abs(targets[i].y - targets[i + 1].y) >= 120) {
                hasBigVerticalSeparation = true;
                break;
            }
        }
        if (!hasBigVerticalSeparation)
            return 'bounce_weave_not_vertical_enough';
    }
    if (archetype === 'wide-sweep') {
        const xs = targets.map(t => t.x);
        if (Math.max(...xs) - Math.min(...xs) < 220)
            return 'wide_sweep_too_narrow';
    }
    if (archetype === 'hazard-orbit') {
        if (hazards.length === 0 || targets.length < 3)
            return 'hazard_orbit_missing_core_geometry';
        const primaryHazard = hazards[0];
        const angles = targets
            .map((target) => {
            let angle = Math.atan2(target.y - primaryHazard.y, target.x - primaryHazard.x);
            if (angle < 0)
                angle += Math.PI * 2;
            return angle;
        })
            .sort((a, b) => a - b);
        const wrappedAngles = [...angles, angles[0] + Math.PI * 2];
        let maxGap = 0;
        for (let i = 0; i < wrappedAngles.length - 1; i++) {
            maxGap = Math.max(maxGap, wrappedAngles[i + 1] - wrappedAngles[i]);
        }
        if (maxGap < 0.7)
            return 'hazard_orbit_missing_entry_lane';
        const distances = targets.map((target) => Math.hypot(target.x - primaryHazard.x, target.y - primaryHazard.y));
        const minDistance = Math.min(...distances);
        const maxDistance = Math.max(...distances);
        if (maxDistance - minDistance > 40)
            return 'hazard_orbit_radius_too_irregular';
    }
    if (archetype === 'delayed-catch') {
        const xs = targets.map((target) => target.x);
        const rightmostTarget = Math.max(...xs);
        const leftmostTarget = Math.min(...xs);
        const sortedTargets = [...targets].sort((a, b) => a.x - b.x);
        const delayedTarget = sortedTargets[sortedTargets.length - 1];
        if (rightmostTarget - leftmostTarget < 180)
            return 'delayed_catch_not_far_enough';
        const earlyTargets = sortedTargets.slice(0, -1);
        const averageEarlyX = earlyTargets.reduce((sum, target) => sum + target.x, 0) / earlyTargets.length;
        if (delayedTarget.x - averageEarlyX < 140)
            return 'delayed_catch_not_distinct_enough';
    }
    if (archetype === 'tight-cluster') {
        if (targets.length < 3)
            return 'tight_cluster_missing_target_cluster';
        const clusterCenter = {
            x: targets.reduce((sum, target) => sum + target.x, 0) / targets.length,
            y: targets.reduce((sum, target) => sum + target.y, 0) / targets.length,
        };
        const maxClusterDistance = Math.max(...targets.map((target) => Math.hypot(target.x - clusterCenter.x, target.y - clusterCenter.y)));
        if (maxClusterDistance > 80)
            return 'tight_cluster_too_spread';
        for (const hazard of hazards) {
            for (const target of targets) {
                const distance = Math.hypot(target.x - hazard.x, target.y - hazard.y);
                const edgeGap = distance - target.r - hazard.r;
                if (edgeGap <= 10)
                    return 'tight_cluster_hazard_readability_too_low';
            }
        }
    }
    return null;
}
function generateDeterministicFallback(seed, index, band) {
    return {
        id: `${seed}-${index}-fallback`,
        targets: [{ x: 300, y: 200, r: 25 }],
        hazards: [],
        meta: {
            archetype: 'open-sweep',
            difficultyBand: band,
            mechanics: ['core'],
            bounceLikelihood: 0,
            densityScore: 0,
            targetCount: 1,
            hazardCount: 0,
        },
    };
}
export function generatePuzzlesForSeed(seed, count = 30, diagnostics) {
    const seedNum = cyrb128(seed);
    const random = mulberry32(seedNum);
    const puzzles = [];
    for (let i = 0; i < count; i++) {
        const band = getBand(i);
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
            }
            else {
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
