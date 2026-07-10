import type { GestureAttempt, SubmitRunRequest } from './api';
import { polylineLength, smoothPath } from './geom';
import {
  getOfficialRunTelemetryLimitError,
  isOfficialRunSubmissionWindowValid,
  MAX_OFFICIAL_ATTEMPTS,
  MAX_OFFICIAL_POINTS,
  MAX_OFFICIAL_RUN_DURATION_MS,
  MAX_OFFICIAL_RUN_SUBMISSION_GRACE_MS,
  validateOfficialRunPayload,
} from './officialRunValidation';
import { generatePuzzlesForSeed } from './puzzle';
import { calculatePuzzleScore } from './scoring';
import { generateSeed } from './seed';

const date = '2026-07-09';
const seed = generateSeed(date);

run();

function run() {
  testAcceptsValidSolve();
  testRejectsStaticBodySolve();
  testRejectsStaticBodyHazardFailureClaim();
  testRejectsSpoofedScore();
  testRejectsImpossibleGesture();
  testRejectsTelemetryOverAttemptBudget();
  testRejectsTelemetryOverPointBudget();
  testSubmissionWindowGrace();
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

function testRejectsStaticBodySolve() {
  const payload = createStaticBodyExploitPayload();
  const result = validateOfficialRunPayload(payload);

  assert(result.accepted === false, 'expected static body exploit to be rejected');
  if (!result.accepted) {
    assert(
      result.reason === 'Submitted gesture does not reproduce the claimed outcome.',
      'expected static body rejection reason'
    );
  }
}

function testRejectsStaticBodyHazardFailureClaim() {
  const payload = createStaticBodyHazardExploitPayload();
  const result = validateOfficialRunPayload(payload);

  assert(result.accepted === false, 'expected static body hazard claim to be rejected');
  if (!result.accepted) {
    const validReasons = [
      'Submitted gesture does not reproduce the claimed outcome.',
      'Submitted gesture timing does not match the claimed result.'
    ];
    assert(
      validReasons.includes(result.reason),
      'expected static body hazard rejection reason, got ' + result.reason
    );
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

function testRejectsTelemetryOverAttemptBudget() {
  const payload = createValidPayload();
  payload.telemetry.attempts = Array.from({ length: MAX_OFFICIAL_ATTEMPTS + 1 }, (_, index) => ({
    ...payload.telemetry.attempts[0]!,
    releaseTimestampMs: 120 + index,
  }));

  const result = getOfficialRunTelemetryLimitError(payload.telemetry);
  assert(result === 'Submission exceeds the attempt limit.', 'expected attempt budget rejection');
}

function testRejectsTelemetryOverPointBudget() {
  const payload = createValidPayload();
  const oversizedPoints = Array.from({ length: MAX_OFFICIAL_POINTS + 1 }, (_, index) =>
    sample(index, 0, index)
  );
  payload.telemetry.attempts = [
    {
      ...payload.telemetry.attempts[0]!,
      pointCount: oversizedPoints.length,
      points: oversizedPoints,
      pathLength: oversizedPoints.length,
      releaseTimestampMs: oversizedPoints.length,
    },
  ];

  const result = getOfficialRunTelemetryLimitError(payload.telemetry);
  assert(result === 'Submission exceeds the point budget.', 'expected point budget rejection');
}

function testSubmissionWindowGrace() {
  const startedAt = 1_000;
  assert(
    isOfficialRunSubmissionWindowValid(
      startedAt,
      startedAt + MAX_OFFICIAL_RUN_DURATION_MS + MAX_OFFICIAL_RUN_SUBMISSION_GRACE_MS
    ),
    'expected submission at grace boundary to be accepted'
  );
  assert(
    !isOfficialRunSubmissionWindowValid(
      startedAt,
      startedAt + MAX_OFFICIAL_RUN_DURATION_MS + MAX_OFFICIAL_RUN_SUBMISSION_GRACE_MS + 1
    ),
    'expected submission beyond grace boundary to be rejected'
  );
}

function createValidPayload(): SubmitRunRequest {
  const target = generatePuzzlesForSeed(seed)[0]!.targets[0]!;
  const points = [
    sample(target.x - 180, target.y, 0),
    sample(target.x - 150, target.y, 30),
    sample(target.x - 120, target.y, 60),
    sample(target.x - 90, target.y, 90),
    sample(target.x - 60, target.y, 120),
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
  const solveTimeMs = 180;
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
          timestampMs: 180,
        },
      ],
      failureEvents: [],
      summary: {
        score,
        puzzlesSolved: 1,
        maxCombo: 1,
        totalRunMs: 180,
      },
    },
  };
}

function createStaticBodyExploitPayload(): SubmitRunRequest {
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
    runId: 'run-exploit',
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

function createStaticBodyHazardExploitPayload(): SubmitRunRequest {
  const puzzles = generatePuzzlesForSeed(seed);
  const targetPuzzleIndex = puzzles.findIndex(p => p.hazards.length > 0);
  const puzzle = puzzles[targetPuzzleIndex]!;
  const hazard = puzzle.hazards[0]!;
  const preludeAttempts: GestureAttempt[] = [];
  const preludeSolveEvents: SubmitRunRequest['telemetry']['solveEvents'] = [];
  let currentPuzzleStartMs = 0;
  let score = 0;

  for (let puzzleIndex = 0; puzzleIndex < targetPuzzleIndex; puzzleIndex++) {
    const target = puzzles[puzzleIndex]!.targets[0]!;
    const points = [
      sample(target.x - 180, target.y, currentPuzzleStartMs),
      sample(target.x - 150, target.y, currentPuzzleStartMs + 30),
      sample(target.x - 120, target.y, currentPuzzleStartMs + 60),
      sample(target.x - 90, target.y, currentPuzzleStartMs + 90),
      sample(target.x - 60, target.y, currentPuzzleStartMs + 120),
    ];
    const smoothed = smoothPath(
      points.map((point) => ({ x: point.x, y: point.y })),
      2
    );
    preludeAttempts.push({
      puzzleIndex,
      startedAtMs: currentPuzzleStartMs,
      releaseTimestampMs: currentPuzzleStartMs + 120,
      pointCount: points.length,
      pathLength: Math.round(polylineLength(smoothed)),
      points,
      outcome: 'success',
    });
    preludeSolveEvents.push({
      puzzleIndex,
      solveTimeMs: 180,
      timestampMs: currentPuzzleStartMs + 180,
    });
    score += calculatePuzzleScore(puzzleIndex, 180, puzzleIndex).totalScore;
    currentPuzzleStartMs += 400;
  }

  const points = [
    sample(hazard.x - 60, hazard.y, currentPuzzleStartMs),
    sample(hazard.x - 30, hazard.y, currentPuzzleStartMs + 30),
    sample(hazard.x, hazard.y, currentPuzzleStartMs + 60),
    sample(hazard.x + 30, hazard.y, currentPuzzleStartMs + 90),
    sample(hazard.x + 60, hazard.y, currentPuzzleStartMs + 120),
  ];
  const smoothed = smoothPath(
    points.map((point) => ({ x: point.x, y: point.y })),
    2
  );
  const attempt: GestureAttempt = {
    puzzleIndex: targetPuzzleIndex,
    startedAtMs: currentPuzzleStartMs,
    releaseTimestampMs: currentPuzzleStartMs + 120,
    pointCount: points.length,
    pathLength: Math.round(polylineLength(smoothed)),
    points,
    outcome: 'failure',
  };

  return {
    runId: 'run-hazard-exploit',
    date,
    seed,
    telemetry: {
      attempts: [...preludeAttempts, attempt],
      solveEvents: preludeSolveEvents,
      failureEvents: [
        {
          puzzleIndex: targetPuzzleIndex,
          timestampMs: currentPuzzleStartMs + 130,
          reason: 'hazard',
        },
      ],
      summary: {
        score,
        puzzlesSolved: targetPuzzleIndex,
        maxCombo: targetPuzzleIndex,
        totalRunMs: currentPuzzleStartMs + 130,
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
