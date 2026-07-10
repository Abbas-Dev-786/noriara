import { normalizePath, polylineLength, segmentIntersectsCircle, smoothPath } from './geom.js';
import { generatePuzzlesForSeed } from './puzzle.js';
const STEP_SIZE = 3;
const SNAKE_SPEED = 300;
const GAME_HEIGHT = 400;
const OFFSCREEN_MARGIN = 50;
const MIN_GESTURE_POINTS = 5;
const MIN_GESTURE_LENGTH = 40;
const MAX_REPLAY_POINTS = 2_500;
const MAX_REPLAY_ATTEMPTS = 120;
const MAX_SIMULATION_STEPS = 3_500;
export function createReplayData(username, date, seed, score, puzzlesSolved, rank, acceptedAt, telemetry) {
    return {
        version: 1,
        date,
        seed,
        username,
        score,
        puzzlesSolved,
        rank,
        acceptedAt,
        telemetry,
    };
}
export function validateReplay(replay) {
    if (replay.version !== 1)
        return false;
    if (!replay.seed || !replay.username || !replay.date)
        return false;
    if (replay.telemetry.attempts.length > MAX_REPLAY_ATTEMPTS)
        return false;
    let pointCount = 0;
    for (const attempt of replay.telemetry.attempts) {
        pointCount += attempt.points.length;
    }
    return pointCount <= MAX_REPLAY_POINTS;
}
export function buildReplayTimeline(replay) {
    const puzzles = generatePuzzlesForSeed(replay.seed);
    const segments = replay.telemetry.attempts
        .map((attempt) => buildReplaySegment(attempt, puzzles[attempt.puzzleIndex]))
        .filter((segment) => segment !== null);
    return {
        totalDurationMs: replay.telemetry.summary.totalRunMs,
        puzzles,
        segments,
    };
}
function buildReplaySegment(attempt, puzzle) {
    if (!puzzle)
        return null;
    const drawingPath = smoothPath(attempt.points.map((point) => ({ x: point.x, y: point.y })), 1);
    const normalizedGesture = normalizePath(smoothPath(attempt.points.map((point) => ({ x: point.x, y: point.y })), 2), STEP_SIZE);
    const gestureLength = polylineLength(normalizedGesture);
    if (normalizedGesture.length < MIN_GESTURE_POINTS || gestureLength < MIN_GESTURE_LENGTH) {
        return null;
    }
    const simulation = simulateReplayAttempt(attempt, normalizedGesture, puzzle.targets, puzzle.hazards);
    return {
        attempt,
        puzzle,
        drawingPath,
        normalizedGesture,
        snakePath: simulation.snakePath,
        snakeLength: normalizedGesture.length,
        targetHits: simulation.targetHits,
        resultStep: simulation.resultStep,
        resultElapsedMs: simulation.resultElapsedMs,
        result: simulation.result,
        failureReason: simulation.failureReason,
    };
}
function simulateReplayAttempt(attempt, normalizedGesture, targets, hazards) {
    const activeTargets = targets.map((target, index) => ({ ...target, replayIndex: index }));
    const snakePath = [...normalizedGesture];
    const snakeLength = normalizedGesture.length;
    const collisionStartBaseIndex = normalizedGesture.length - 1;
    const targetHits = [];
    let headIndex = normalizedGesture.length - 1;
    let yDir = 1;
    for (let step = 1; step <= MAX_SIMULATION_STEPS; step++) {
        const baseIndex = headIndex % (normalizedGesture.length - 1);
        const from = normalizedGesture[baseIndex];
        const to = normalizedGesture[baseIndex + 1];
        const currentHead = snakePath[headIndex];
        const bounced = applyBounce({
            x: currentHead.x + (to.x - from.x),
            y: currentHead.y + (to.y - from.y) * yDir,
        }, yDir);
        yDir = bounced.yDir;
        headIndex++;
        snakePath[headIndex] = bounced.point;
        const tailIndex = Math.max(0, headIndex - snakeLength + 1);
        const collisionStartIndex = Math.max(tailIndex, collisionStartBaseIndex);
        let hazardHit = false;
        for (let i = collisionStartIndex; i < headIndex; i++) {
            const s1 = snakePath[i];
            const s2 = snakePath[i + 1];
            for (const hazard of hazards) {
                if (segmentIntersectsCircle(s1, s2, hazard, hazard.r)) {
                    hazardHit = true;
                    break;
                }
            }
            if (hazardHit)
                break;
            for (let tIndex = activeTargets.length - 1; tIndex >= 0; tIndex--) {
                const target = activeTargets[tIndex];
                if (segmentIntersectsCircle(s1, s2, target, target.r)) {
                    targetHits.push({ step, targetIndex: target.replayIndex });
                    activeTargets.splice(tIndex, 1);
                }
            }
        }
        if (hazardHit) {
            return {
                snakePath,
                targetHits,
                resultStep: step,
                resultElapsedMs: stepToMs(step),
                result: 'failure',
                failureReason: 'hazard',
            };
        }
        if (activeTargets.length === 0) {
            return {
                snakePath,
                targetHits,
                resultStep: step,
                resultElapsedMs: stepToMs(step),
                result: 'success',
                failureReason: null,
            };
        }
        if (!isAnyBodyPointVisible(snakePath, tailIndex, headIndex)) {
            return {
                snakePath,
                targetHits,
                resultStep: step,
                resultElapsedMs: stepToMs(step),
                result: 'failure',
                failureReason: 'escape',
            };
        }
    }
    return {
        snakePath,
        targetHits,
        resultStep: MAX_SIMULATION_STEPS,
        resultElapsedMs: stepToMs(MAX_SIMULATION_STEPS),
        result: attempt.outcome,
        failureReason: attempt.outcome === 'failure' ? 'escape' : null,
    };
}
function applyBounce(point, yDir) {
    const bounced = { ...point };
    let nextYDir = yDir;
    while (bounced.y < 0 || bounced.y > GAME_HEIGHT) {
        if (bounced.y < 0) {
            bounced.y = -bounced.y;
            nextYDir *= -1;
        }
        else if (bounced.y > GAME_HEIGHT) {
            bounced.y = GAME_HEIGHT - (bounced.y - GAME_HEIGHT);
            nextYDir *= -1;
        }
    }
    return { point: bounced, yDir: nextYDir };
}
function isAnyBodyPointVisible(path, tailIndex, headIndex) {
    for (let i = tailIndex; i <= headIndex; i++) {
        const point = path[i];
        if (point.x >= -OFFSCREEN_MARGIN && point.x <= 600 + OFFSCREEN_MARGIN) {
            return true;
        }
    }
    return false;
}
function stepToMs(step) {
    return Math.round((step * STEP_SIZE * 1000) / SNAKE_SPEED);
}
