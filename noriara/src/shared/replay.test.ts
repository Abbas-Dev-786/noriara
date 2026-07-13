import type { RunTelemetry } from './api';
import { buildReplayTimeline, createReplayData, validateReplay } from './replay';

run();

function run() {
  testDailyReplayStoresVariant();
  testRejectsNonDailyReplayVariant();
  console.log('replay tests passed');
}

function testDailyReplayStoresVariant() {
  const replay = createReplayData(
    'player-1',
    '2026-07-09',
    'seed-1',
    'daily',
    100,
    1,
    2,
    '2026-07-09T00:00:00.000Z',
    emptyTelemetry()
  );

  assert(replay.runVariant === 'daily', 'expected replay variant to be persisted');
  assert(validateReplay(replay), 'expected daily replay to be valid');
  assert(buildReplayTimeline(replay).puzzles.length > 0, 'expected daily replay timeline to rebuild puzzles');
}

function testRejectsNonDailyReplayVariant() {
  const replay = createReplayData(
    'player-1',
    '2026-07-09',
    'seed-1',
    'daily',
    100,
    1,
    2,
    '2026-07-09T00:00:00.000Z',
    emptyTelemetry()
  );
  (replay as unknown as { runVariant: string }).runVariant = 'event';

  assert(!validateReplay(replay), 'expected non-daily replay variant to be rejected');
}

function emptyTelemetry(): RunTelemetry {
  return {
    attempts: [],
    solveEvents: [],
    failureEvents: [],
    summary: {
      score: 100,
      puzzlesSolved: 1,
      maxCombo: 1,
      totalRunMs: 1000,
    },
  };
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
