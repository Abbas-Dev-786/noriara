import { generatePuzzlesForSeed, PROTOTYPE_MECHANICS_REGISTRY } from './puzzle.js';
function assert(condition, msg) {
    if (!condition) {
        throw new Error(msg ?? 'Assertion failed');
    }
}
function deepEqual(a, b, msg) {
    if (JSON.stringify(a) !== JSON.stringify(b)) {
        throw new Error(msg ?? 'Deep equality failed');
    }
}
function notDeepEqual(a, b, msg) {
    if (JSON.stringify(a) === JSON.stringify(b)) {
        throw new Error(msg ?? 'Not deep equality failed');
    }
}
function run() {
    testDeterministicGeneration();
    testTutorialPuzzle();
    testElementBounds();
    testElementSpacing();
    testMetadataMatchesGeometry();
    testBandComplexityLimits();
    testAllLayoutsUseEnabledCoreMechanics();
    testArchetypeSpecificGeometry();
    console.log('puzzle generator tests passed');
}
function testDeterministicGeneration() {
    const puzzlesA = generatePuzzlesForSeed('test-seed-1', 30);
    const puzzlesB = generatePuzzlesForSeed('test-seed-1', 30);
    const puzzlesC = generatePuzzlesForSeed('different-seed', 30);
    assert(puzzlesA.length === 30, 'length should be 30');
    deepEqual(puzzlesA, puzzlesB, 'expected generation to be deterministic');
    notDeepEqual(puzzlesA, puzzlesC, 'expected different seeds to produce different puzzles');
}
function testTutorialPuzzle() {
    const puzzles = generatePuzzlesForSeed('test-seed-first-puzzle', 5);
    const tutorial = puzzles[0];
    assert(tutorial !== undefined, 'tutorial puzzle should exist');
    assert(tutorial.meta?.difficultyBand === 'tutorial', 'expected tutorial band');
    assert(tutorial.targets.length === 1, 'expected 1 target');
    assert(tutorial.hazards.length === 0, 'expected 0 hazards');
    assert(tutorial.meta?.archetype === 'open-sweep', 'expected open-sweep');
}
function testElementBounds() {
    const puzzles = generatePuzzlesForSeed('bounds-check-seed', 30);
    for (const puzzle of puzzles) {
        for (const t of puzzle.targets) {
            assert(t.x >= 80 && t.x <= 520, 'target x out of bounds');
            assert(t.y >= 70 && t.y <= 330, 'target y out of bounds');
        }
        for (const h of puzzle.hazards) {
            assert(h.x >= 100 && h.x <= 500, 'hazard x out of bounds');
            assert(h.y >= 90 && h.y <= 310, 'hazard y out of bounds');
        }
    }
}
function testElementSpacing() {
    const puzzles = generatePuzzlesForSeed('spacing-check-seed', 30);
    for (const puzzle of puzzles) {
        // Target-target
        for (let i = 0; i < puzzle.targets.length; i++) {
            for (let j = i + 1; j < puzzle.targets.length; j++) {
                const d = Math.hypot(puzzle.targets[i].x - puzzle.targets[j].x, puzzle.targets[i].y - puzzle.targets[j].y);
                assert(d >= 56, 'targets too close');
            }
        }
        // Target-hazard
        for (const t of puzzle.targets) {
            for (const h of puzzle.hazards) {
                const d = Math.hypot(t.x - h.x, t.y - h.y);
                assert(d >= t.r + h.r + 18, 'target and hazard too close');
            }
        }
        // Hazard-hazard
        for (let i = 0; i < puzzle.hazards.length; i++) {
            for (let j = i + 1; j < puzzle.hazards.length; j++) {
                const d = Math.hypot(puzzle.hazards[i].x - puzzle.hazards[j].x, puzzle.hazards[i].y - puzzle.hazards[j].y);
                assert(d >= puzzle.hazards[i].r + puzzle.hazards[j].r + 20, 'hazards too close');
            }
        }
    }
}
function testMetadataMatchesGeometry() {
    const puzzles = generatePuzzlesForSeed('metadata-check-seed', 30);
    for (const puzzle of puzzles) {
        assert(puzzle.meta !== undefined, 'puzzle meta should exist');
        assert(puzzle.meta.targetCount === puzzle.targets.length, 'meta targetCount mismatch');
        assert(puzzle.meta.hazardCount === puzzle.hazards.length, 'meta hazardCount mismatch');
    }
}
function testBandComplexityLimits() {
    const puzzles = generatePuzzlesForSeed('band-limits-seed', 30);
    for (let i = 0; i < puzzles.length; i++) {
        const puzzle = puzzles[i];
        if (puzzle.meta?.difficultyBand === 'easy') {
            assert(puzzle.targets.length <= 2, `easy puzzle ${i} has too many targets`);
            assert(puzzle.hazards.length === 0, `easy puzzle ${i} has hazards`);
        }
        if (puzzle.meta?.difficultyBand === 'medium') {
            assert(puzzle.targets.length <= 4, `medium puzzle ${i} has too many targets`);
            assert(puzzle.hazards.length <= 1, `medium puzzle ${i} has too many hazards`);
        }
    }
}
function testAllLayoutsUseEnabledCoreMechanics() {
    const puzzles = generatePuzzlesForSeed('mechanics-check-seed', 30);
    for (const puzzle of puzzles) {
        const mechanics = puzzle.meta?.mechanics ?? [];
        assert(mechanics.length > 0, 'layout mechanics should be declared');
        assert(mechanics.every((mechanic) => mechanic === 'core'), 'non-core mechanics should not be generated');
    }
    assert(Object.values(PROTOTYPE_MECHANICS_REGISTRY).every((enabled) => enabled === false), 'prototype mechanics should remain disabled by default');
}
function testArchetypeSpecificGeometry() {
    const puzzles = generatePuzzlesForSeed('archetype-geometry-seed', 120);
    let sawHazardOrbit = false;
    let sawDelayedCatch = false;
    let sawTightCluster = false;
    for (const puzzle of puzzles) {
        const archetype = puzzle.meta?.archetype;
        if (archetype === 'hazard-orbit') {
            sawHazardOrbit = true;
            const primaryHazard = puzzle.hazards[0];
            assert(primaryHazard !== undefined, 'hazard-orbit should have a primary hazard');
            const angles = puzzle.targets
                .map((target) => {
                let angle = Math.atan2(target.y - primaryHazard.y, target.x - primaryHazard.x);
                if (angle < 0)
                    angle += Math.PI * 2;
                return angle;
            })
                .sort((a, b) => a - b);
            const wrapped = [...angles, angles[0] + Math.PI * 2];
            let maxGap = 0;
            for (let i = 0; i < wrapped.length - 1; i++) {
                maxGap = Math.max(maxGap, wrapped[i + 1] - wrapped[i]);
            }
            assert(maxGap >= 0.7, 'hazard-orbit should preserve an entry lane');
        }
        if (archetype === 'delayed-catch') {
            sawDelayedCatch = true;
            const xs = puzzle.targets.map((target) => target.x);
            assert(Math.max(...xs) - Math.min(...xs) >= 180, 'delayed-catch should spread the catch target');
        }
        if (archetype === 'tight-cluster') {
            sawTightCluster = true;
            const clusterCenter = {
                x: puzzle.targets.reduce((sum, target) => sum + target.x, 0) / puzzle.targets.length,
                y: puzzle.targets.reduce((sum, target) => sum + target.y, 0) / puzzle.targets.length,
            };
            const maxDistance = Math.max(...puzzle.targets.map((target) => Math.hypot(target.x - clusterCenter.x, target.y - clusterCenter.y)));
            assert(maxDistance <= 80, 'tight-cluster should remain visually compact');
        }
    }
    assert(sawHazardOrbit, 'expected to generate at least one hazard-orbit puzzle');
    assert(sawDelayedCatch, 'expected to generate at least one delayed-catch puzzle');
    assert(sawTightCluster, 'expected to generate at least one tight-cluster puzzle');
}
run();
