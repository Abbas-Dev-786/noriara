import type { GestureAttempt, SubmitRunRequest } from './api';
import { polylineLength, smoothPath } from './geom';
import { validateOfficialRunPayload } from './officialRunValidation';
import { generatePuzzlesForSeed } from './puzzle';
import { calculatePuzzleScore } from './scoring';
import { generateSeed } from './seed';

const date = '2026-07-09';
const seed = generateSeed(date);

run();

function run() {
  testAcceptsValidSolve();
  testRejectsSpoofedScore();
  testRejectsImpossibleGesture();
  console.log('officialRunValidation tests passed');
}

function testAcceptsValidSolve() {
  const payload = createValidPayload();
  const result = validateOfficialRunPayload(payload);

  assert(result.accepted === true, 'expected valid payload to be accepted');
  if (result.accepted) {
    assert(result.finalScore === payload.telemetry.summary.score, 'expected score to match summary');
    assert(result.puzzlesSolved === 1, 'expected one solved puzzle');
    assert(result.maxCombo === 1, 'expected max combo of one');
  }
}

function testRejectsSpoofedScore() {
  const payload = createValidPayload();
  payload.telemetry.summary.score += 1;

  const result = validateOfficialRunPayload(payload);

  assert(result.accepted === false, 'expected spoofed score to be rejected');
  if (!result.accepted) {
    assert(result.reason === 'Server score does not match submitted score.', 'expected score mismatch rejection');
  }
}

function testRejectsImpossibleGesture() {
  const payload = createValidPayload();
  const shiftedPoints = payload.telemetry.attempts[0]!.points.map((point) => ({
    ...point,
    x: point.x - 220,
    y: point.y - 120,
  }));
  const shiftedSmooth = smoothPath(
    shiftedPoints.map((point) => ({ x: point.x, y: point.y })),
    2
  );

  payload.telemetry.attempts[0] = {
    ...payload.telemetry.attempts[0]!,
    points: shiftedPoints,
    pathLength: Math.round(polylineLength(shiftedSmooth)),
  };

  const result = validateOfficialRunPayload(payload);

  assert(result.accepted === false, 'expected impossible gesture to be rejected');
  if (!result.accepted) {
    assert(
      result.reason === 'Submitted gesture does not reproduce the claimed outcome.',
      'expected gesture reproduction rejection'
    );
  }
}

function createValidPayload(): SubmitRunRequest {
  const target = generatePuzzlesForSeed(seed)[0]!.targets[0]!;
  const points = [
    sample(target.x - 60, target.y, 0),
    sample(target.x - 30, target.y, 30),
    sample(target.x, target.y, 60),
    sample(target.x + 30, target.y, 90),
    sample(target.x + 60, target.y, 120),
  ];
  const smoothed = smoothPath(
    points.map((point) => ({ x: point.x, y: point.y })),
    2
  );
  const attempt: GestureAttempt = {
    puzzleIndex: 0,
    startedAtMs: 0,
    releaseTimestampMs: 120,
    pointCount: points.length,
    pathLength: Math.round(polylineLength(smoothed)),
    points,
    outcome: 'success',
  };
  const solveTimeMs = 130;
  const score = calculatePuzzleScore(0, solveTimeMs, 0).totalScore;

  return {
    runId: 'run-1',
    date,
    seed,
    telemetry: {
      attempts: [attempt],
      solveEvents: [
        {
          puzzleIndex: 0,
          solveTimeMs,
          timestampMs: 130,
        },
      ],
      failureEvents: [],
      summary: {
        score,
        puzzlesSolved: 1,
        maxCombo: 1,
        totalRunMs: 130,
      },
    },
  };
}

function sample(x: number, y: number, t: number) {
  return { x, y, t };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
