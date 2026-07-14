import type { FailureReason, GestureAttempt, RunTelemetry, RunVariant } from './api';
import { normalizePath, Point, polylineLength, segmentIntersectsCircle, smoothPath } from './geom';
import { generatePuzzlesForSeed, PuzzleLayout, PuzzleShape } from './puzzle';

export interface ReplayData {
  version: 1;
  date: string;
  seed: string;
  runVariant: RunVariant;
  puzzleCount: number;
  username: string;
  score: number;
  puzzlesSolved: number;
  rank: number | null;
  acceptedAt: string;
  telemetry: RunTelemetry;
}

export interface ReplayResponse {
  status: 'ok';
  replay: ReplayData | null;
}

export interface ReplayTimeline {
  totalDurationMs: number;
  puzzles: PuzzleLayout[];
  segments: ReplaySegment[];
}

export interface ReplaySegment {
  attempt: GestureAttempt;
  puzzle: PuzzleLayout;
  drawingPath: Point[];
  normalizedGesture: Point[];
  snakePath: Point[];
  snakeLength: number;
  targetHits: Array<{ step: number; targetIndex: number }>;
  resultStep: number;
  resultElapsedMs: number;
  result: 'success' | 'failure';
  failureReason: FailureReason | null;
}

const STEP_SIZE = 3;
const SNAKE_SPEED = 300;
const GAME_HEIGHT = 400;
const OFFSCREEN_MARGIN = 50;
const MIN_GESTURE_POINTS = 5;
const MIN_GESTURE_LENGTH = 40;
const MAX_REPLAY_POINTS = 2_500;
const MAX_REPLAY_ATTEMPTS = 120;
const MAX_SIMULATION_STEPS = 3_500;

export function createReplayData(
  username: string,
  date: string,
  seed: string,
  runVariant: RunVariant,
  puzzleCount: number,
  score: number,
  puzzlesSolved: number,
  rank: number | null,
  acceptedAt: string,
  telemetry: RunTelemetry
): ReplayData {
  return {
    version: 1,
    date,
    seed,
    runVariant,
    puzzleCount,
    username,
    score,
    puzzlesSolved,
    rank,
    acceptedAt,
    telemetry,
  };
}

export function validateReplay(replay: ReplayData): boolean {
  if (replay.version !== 1) return false;
  if (!replay.seed || !replay.username || !replay.date) return false;
  if (replay.runVariant !== 'daily' && replay.runVariant !== 'event') return false;
  if (!Number.isInteger(replay.puzzleCount) || replay.puzzleCount <= 0 || replay.puzzleCount > 120) return false;
  if (replay.telemetry.attempts.length > MAX_REPLAY_ATTEMPTS) return false;

  let pointCount = 0;
  for (const attempt of replay.telemetry.attempts) {
    pointCount += attempt.points.length;
  }

  return pointCount <= MAX_REPLAY_POINTS;
}

export function buildReplayTimeline(replay: ReplayData): ReplayTimeline {
  const puzzles = generatePuzzlesForSeed(
    replay.seed,
    replay.puzzleCount,
    undefined,
    replay.runVariant === 'event'
  );
  const segments = replay.telemetry.attempts
    .map((attempt) => buildReplaySegment(attempt, puzzles[attempt.puzzleIndex]))
    .filter((segment): segment is ReplaySegment => segment !== null);

  return {
    totalDurationMs: replay.telemetry.summary.totalRunMs,
    puzzles,
    segments,
  };
}

function buildReplaySegment(attempt: GestureAttempt, puzzle?: PuzzleLayout): ReplaySegment | null {
  if (!puzzle) return null;

  const drawingPath = smoothPath(
    attempt.points.map((point) => ({ x: point.x, y: point.y })),
    1
  );
  const normalizedGesture = normalizePath(
    smoothPath(
      attempt.points.map((point) => ({ x: point.x, y: point.y })),
      2
    ),
    STEP_SIZE
  );
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

function simulateReplayAttempt(
  attempt: GestureAttempt,
  normalizedGesture: Point[],
  targets: PuzzleShape[],
  hazards: PuzzleShape[]
) {
  const activeTargets = targets.map((target, index) => ({ ...target, replayIndex: index }));
  const snakePath = [...normalizedGesture];
  const snakeLength = normalizedGesture.length;
  const collisionStartBaseIndex = normalizedGesture.length - 1;
  const targetHits: Array<{ step: number; targetIndex: number }> = [];
  let headIndex = normalizedGesture.length - 1;
  let yDir = 1;

  for (let step = 1; step <= MAX_SIMULATION_STEPS; step++) {
    const baseIndex = headIndex % (normalizedGesture.length - 1);
    const from = normalizedGesture[baseIndex] as Point;
    const to = normalizedGesture[baseIndex + 1] as Point;
    const currentHead = snakePath[headIndex] as Point;
    const bounced = applyBounce(
      {
        x: currentHead.x + (to.x - from.x),
        y: currentHead.y + (to.y - from.y) * yDir,
      },
      yDir
    );

    yDir = bounced.yDir;
    headIndex++;
    snakePath[headIndex] = bounced.point;

    const tailIndex = Math.max(0, headIndex - snakeLength + 1);
    const collisionStartIndex = Math.max(tailIndex, collisionStartBaseIndex);
    let hazardHit = false;

    for (let i = collisionStartIndex; i < headIndex; i++) {
      const s1 = snakePath[i] as Point;
      const s2 = snakePath[i + 1] as Point;

      for (const hazard of hazards) {
        if (segmentIntersectsCircle(s1, s2, hazard, hazard.r)) {
          hazardHit = true;
          break;
        }
      }
      if (hazardHit) break;

      for (let tIndex = activeTargets.length - 1; tIndex >= 0; tIndex--) {
        const target = activeTargets[tIndex]!;
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
        result: 'failure' as const,
        failureReason: 'hazard' as FailureReason,
      };
    }

    if (activeTargets.length === 0) {
      return {
        snakePath,
        targetHits,
        resultStep: step,
        resultElapsedMs: stepToMs(step),
        result: 'success' as const,
        failureReason: null,
      };
    }

    if (!isAnyBodyPointVisible(snakePath, tailIndex, headIndex)) {
      return {
        snakePath,
        targetHits,
        resultStep: step,
        resultElapsedMs: stepToMs(step),
        result: 'failure' as const,
        failureReason: 'escape' as FailureReason,
      };
    }
  }

  return {
    snakePath,
    targetHits,
    resultStep: MAX_SIMULATION_STEPS,
    resultElapsedMs: stepToMs(MAX_SIMULATION_STEPS),
    result: attempt.outcome,
    failureReason: attempt.outcome === 'failure' ? ('escape' as FailureReason) : null,
  };
}

function applyBounce(point: Point, yDir: number): { point: Point; yDir: number } {
  const bounced = { ...point };
  let nextYDir = yDir;

  while (bounced.y < 0 || bounced.y > GAME_HEIGHT) {
    if (bounced.y < 0) {
      bounced.y = -bounced.y;
      nextYDir *= -1;
    } else if (bounced.y > GAME_HEIGHT) {
      bounced.y = GAME_HEIGHT - (bounced.y - GAME_HEIGHT);
      nextYDir *= -1;
    }
  }

  return { point: bounced, yDir: nextYDir };
}

function isAnyBodyPointVisible(path: Point[], tailIndex: number, headIndex: number): boolean {
  for (let i = tailIndex; i <= headIndex; i++) {
    const point = path[i] as Point;
    if (point.x >= -OFFSCREEN_MARGIN && point.x <= 600 + OFFSCREEN_MARGIN) {
      return true;
    }
  }
  return false;
}

function stepToMs(step: number): number {
  return Math.round((step * STEP_SIZE * 1000) / SNAKE_SPEED);
}
