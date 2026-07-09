import type {
  FailureEvent,
  FailureReason,
  GestureAttempt,
  SubmitRunRequest,
} from './api';
import { normalizePath, Point, polylineLength, segmentIntersectsCircle, smoothPath } from './geom';
import { generatePuzzlesForSeed, PuzzleShape } from './puzzle';
import { calculatePuzzleScore } from './scoring';

export type ValidationResult =
  | {
      accepted: true;
      finalScore: number;
      puzzlesSolved: number;
      maxCombo: number;
      totalRunMs: number;
      lastSolveTimestampMs: number;
    }
  | {
      accepted: false;
      reason: string;
    };

const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;
const STEP_SIZE = 3;
const SNAKE_SPEED = 300;
const MIN_GESTURE_POINTS = 5;
const MIN_GESTURE_LENGTH = 40;
const OFFSCREEN_MARGIN = 50;
const FAILURE_RESET_DELAY_MS = 320;
const SUCCESS_ADVANCE_DELAY_MS = 220;
const TIMING_TOLERANCE_MS = 120;
const MAX_SIMULATION_STEPS = 3_500;

type AttemptEvent =
  | {
      type: 'success';
      timestampMs: number;
      solveTimeMs: number;
      puzzleIndex: number;
    }
  | {
      type: 'failure';
      timestampMs: number;
      reason: FailureReason;
      puzzleIndex: number;
    };

type SimulatedAttemptResult =
  | {
      outcome: 'success';
      elapsedMs: number;
    }
  | {
      outcome: 'failure';
      elapsedMs: number;
      reason: FailureReason;
    };

export function validateOfficialRunPayload(payload: SubmitRunRequest): ValidationResult {
  const { telemetry } = payload;
  const { attempts, solveEvents, failureEvents, summary } = telemetry;

  if (!payload.runId || !payload.date || !payload.seed) {
    return { accepted: false, reason: 'Missing submission identifiers.' };
  }

  if (summary.totalRunMs < 0 || summary.totalRunMs > 31_000) {
    return { accepted: false, reason: 'Run duration is not plausible.' };
  }

  if (solveEvents.length !== summary.puzzlesSolved) {
    return { accepted: false, reason: 'Puzzle count does not match solve events.' };
  }

  for (let i = 0; i < solveEvents.length; i++) {
    const solve = solveEvents[i]!;
    if (solve.puzzleIndex !== i) {
      return { accepted: false, reason: 'Solve order is invalid.' };
    }
    if (solve.solveTimeMs <= 0 || solve.solveTimeMs > 30_000) {
      return { accepted: false, reason: 'Solve time is invalid.' };
    }
    if (solve.timestampMs < solve.solveTimeMs || solve.timestampMs > 31_000) {
      return { accepted: false, reason: 'Solve timestamp is invalid.' };
    }
    if (i > 0 && solve.timestampMs <= solveEvents[i - 1]!.timestampMs) {
      return { accepted: false, reason: 'Solve timestamps must increase.' };
    }
  }

  for (let i = 0; i < failureEvents.length; i++) {
    const failure = failureEvents[i]!;
    if (failure.timestampMs < 0 || failure.timestampMs > 31_000) {
      return { accepted: false, reason: 'Failure timestamp is invalid.' };
    }
    if (i > 0 && failure.timestampMs <= failureEvents[i - 1]!.timestampMs) {
      return { accepted: false, reason: 'Failure timestamps must increase.' };
    }
  }

  if (attempts.length < solveEvents.length) {
    return { accepted: false, reason: 'Attempt telemetry is incomplete.' };
  }

  const puzzles = generatePuzzlesForSeed(payload.seed);
  let currentPuzzleIndex = 0;
  let currentPuzzleStartMs = 0;
  let recomputedScore = 0;
  let combo = 0;
  let maxCombo = 0;
  let previousSolveTimestamp = 0;
  let solveIndex = 0;
  let failureIndex = 0;

  for (const attempt of attempts) {
    if (currentPuzzleIndex >= puzzles.length) {
      return { accepted: false, reason: 'Submission contains attempts beyond the puzzle list.' };
    }
    if (attempt.puzzleIndex !== currentPuzzleIndex) {
      return { accepted: false, reason: 'Attempt puzzle index is invalid.' };
    }
    if (!isAttemptTelemetryValid(attempt)) {
      return { accepted: false, reason: 'Attempt telemetry is invalid.' };
    }
    if (attempt.startedAtMs < currentPuzzleStartMs) {
      return { accepted: false, reason: 'Attempt started before the puzzle was ready.' };
    }

    const event = consumeAttemptEvent(
      attempt,
      solveEvents,
      failureEvents,
      solveIndex,
      failureIndex
    );
    if (!event) {
      return { accepted: false, reason: 'Attempt outcomes do not match the event stream.' };
    }

    const simulation = simulateAttempt(attempt, puzzles[currentPuzzleIndex]!.targets, puzzles[currentPuzzleIndex]!.hazards);
    if (simulation.outcome !== attempt.outcome || simulation.outcome !== event.type) {
      return { accepted: false, reason: 'Submitted gesture does not reproduce the claimed outcome.' };
    }

    const expectedTimestamp = attempt.releaseTimestampMs + simulation.elapsedMs;
    if (Math.abs(expectedTimestamp - event.timestampMs) > TIMING_TOLERANCE_MS) {
      return { accepted: false, reason: 'Submitted gesture timing does not match the claimed result.' };
    }

    if (simulation.outcome === 'failure') {
      if (event.type !== 'failure' || simulation.reason !== event.reason) {
        return { accepted: false, reason: 'Failure reason does not match simulated outcome.' };
      }
      combo = 0;
      currentPuzzleStartMs = event.timestampMs + FAILURE_RESET_DELAY_MS;
      failureIndex++;
      continue;
    }

    if (event.type !== 'success') {
      return { accepted: false, reason: 'Submission outcome does not match the solve stream.' };
    }

    const simulatedSolveTime = event.timestampMs - currentPuzzleStartMs;
    if (Math.abs(simulatedSolveTime - event.solveTimeMs) > TIMING_TOLERANCE_MS) {
      return { accepted: false, reason: 'Solve time does not match simulated puzzle timing.' };
    }

    const scoreResult = calculatePuzzleScore(attempt.puzzleIndex, event.solveTimeMs, combo);
    recomputedScore += scoreResult.totalScore;
    combo += 1;
    maxCombo = Math.max(maxCombo, combo);
    previousSolveTimestamp = event.timestampMs;
    currentPuzzleIndex++;
    currentPuzzleStartMs = event.timestampMs + SUCCESS_ADVANCE_DELAY_MS;
    solveIndex++;
  }

  if (solveIndex !== solveEvents.length || failureIndex !== failureEvents.length) {
    return { accepted: false, reason: 'Submission did not account for every event.' };
  }

  if (recomputedScore !== summary.score) {
    return { accepted: false, reason: 'Server score does not match submitted score.' };
  }

  if (maxCombo !== summary.maxCombo) {
    return { accepted: false, reason: 'Combo summary does not match event sequence.' };
  }

  return {
    accepted: true,
    finalScore: recomputedScore,
    puzzlesSolved: solveEvents.length,
    maxCombo,
    totalRunMs: summary.totalRunMs,
    lastSolveTimestampMs: previousSolveTimestamp,
  };
}

function isAttemptTelemetryValid(attempt: GestureAttempt): boolean {
  if (attempt.pointCount < MIN_GESTURE_POINTS || attempt.points.length !== attempt.pointCount) {
    return false;
  }
  if (attempt.pathLength < MIN_GESTURE_LENGTH) {
    return false;
  }
  if (attempt.releaseTimestampMs > 31_000 || attempt.startedAtMs < 0) {
    return false;
  }
  if (attempt.releaseTimestampMs <= attempt.startedAtMs) {
    return false;
  }
  if (attempt.points[0]!.t !== attempt.startedAtMs) {
    return false;
  }
  if (attempt.points[attempt.points.length - 1]!.t > attempt.releaseTimestampMs + 34) {
    return false;
  }
  for (let i = 1; i < attempt.points.length; i++) {
    if (attempt.points[i]!.t < attempt.points[i - 1]!.t) {
      return false;
    }
  }

  const smoothed = smoothPath(
    attempt.points.map((point) => ({ x: point.x, y: point.y })),
    2
  );
  const pathLength = Math.round(polylineLength(smoothed));
  if (Math.abs(pathLength - attempt.pathLength) > 1) {
    return false;
  }

  const normalized = normalizePath(smoothed, STEP_SIZE);
  return normalized.length >= MIN_GESTURE_POINTS;
}

function consumeAttemptEvent(
  attempt: GestureAttempt,
  solveEvents: SubmitRunRequest['telemetry']['solveEvents'],
  failureEvents: FailureEvent[],
  solveIndex: number,
  failureIndex: number
): AttemptEvent | null {
  if (attempt.outcome === 'success') {
    const solve = solveEvents[solveIndex];
    if (!solve || solve.puzzleIndex !== attempt.puzzleIndex || solve.timestampMs < attempt.releaseTimestampMs) {
      return null;
    }

    return {
      type: 'success',
      timestampMs: solve.timestampMs,
      solveTimeMs: solve.solveTimeMs,
      puzzleIndex: solve.puzzleIndex,
    };
  }

  const failure = failureEvents[failureIndex];
  if (!failure || failure.puzzleIndex !== attempt.puzzleIndex || failure.timestampMs < attempt.releaseTimestampMs) {
    return null;
  }

  return {
    type: 'failure',
    timestampMs: failure.timestampMs,
    reason: failure.reason,
    puzzleIndex: failure.puzzleIndex,
  };
}

function simulateAttempt(
  attempt: GestureAttempt,
  targets: PuzzleShape[],
  hazards: PuzzleShape[]
): SimulatedAttemptResult {
  const baseGesture = normalizePath(
    smoothPath(
      attempt.points.map((point) => ({ x: point.x, y: point.y })),
      2
    ),
    STEP_SIZE
  );

  const gestureLength = polylineLength(baseGesture);
  if (baseGesture.length < MIN_GESTURE_POINTS || gestureLength < MIN_GESTURE_LENGTH) {
    return {
      outcome: 'failure',
      elapsedMs: 0,
      reason: 'escape',
    };
  }

  const activeTargets = targets.map((target) => ({ ...target }));
  const snakePath = [...baseGesture];
  const snakeLength = baseGesture.length;
  let headIndex = baseGesture.length - 1;
  let yDir = 1;

  for (let step = 1; step <= MAX_SIMULATION_STEPS; step++) {
    const baseIndex = headIndex % (baseGesture.length - 1);
    const from = baseGesture[baseIndex] as Point;
    const to = baseGesture[baseIndex + 1] as Point;
    const currentHead = snakePath[headIndex] as Point;
    const bounced = applyBounce({
      x: currentHead.x + (to.x - from.x),
      y: currentHead.y + (to.y - from.y) * yDir,
    }, yDir);

    yDir = bounced.yDir;
    headIndex++;
    snakePath[headIndex] = bounced.point;

    const tailIndex = Math.max(0, headIndex - snakeLength + 1);
    let hazardHit = false;

    for (let i = tailIndex; i < headIndex; i++) {
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
        const target = activeTargets[tIndex] as PuzzleShape;
        if (segmentIntersectsCircle(s1, s2, target, target.r)) {
          activeTargets.splice(tIndex, 1);
        }
      }
    }

    if (hazardHit) {
      return {
        outcome: 'failure',
        elapsedMs: stepToMs(step),
        reason: 'hazard',
      };
    }

    if (activeTargets.length === 0) {
      return {
        outcome: 'success',
        elapsedMs: stepToMs(step),
      };
    }

    if (!isAnyBodyPointVisible(snakePath, tailIndex, headIndex)) {
      return {
        outcome: 'failure',
        elapsedMs: stepToMs(step),
        reason: 'escape',
      };
    }
  }

  return {
    outcome: 'failure',
    elapsedMs: stepToMs(MAX_SIMULATION_STEPS),
    reason: 'escape',
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
    if (point.x >= -OFFSCREEN_MARGIN && point.x <= GAME_WIDTH + OFFSCREEN_MARGIN) {
      return true;
    }
  }
  return false;
}

function stepToMs(step: number): number {
  return Math.round((step * STEP_SIZE * 1000) / SNAKE_SPEED);
}
