import { buildPersonalBestSummary, computeNextStreak, diffUtcDays, getEmptyPlayerStats, updatePlayerStats } from './playerStats';

run();

function run() {
  testUtcDayDiff();
  testStreakIncrementsAcrossAdjacentUtcDays();
  testStreakResetsAfterGap();
  testPersonalBestSummary();
  console.log('playerStats tests passed');
}

function testUtcDayDiff() {
  assert(diffUtcDays('2026-07-09', '2026-07-10') === 1, 'expected one day utc diff');
  assert(diffUtcDays('2026-07-09', '2026-07-12') === 3, 'expected three day utc diff');
}

function testStreakIncrementsAcrossAdjacentUtcDays() {
  const base = getEmptyPlayerStats();
  const first = updatePlayerStats(base, '2026-07-09', 400, 3, 8);
  const second = updatePlayerStats(first, '2026-07-10', 450, 4, 5);

  assert(computeNextStreak('2026-07-09', '2026-07-10', 1) === 2, 'expected next streak to increment');
  assert(second.currentStreak === 2, 'expected streak to be two');
  assert(second.longestStreak === 2, 'expected longest streak to be two');
  assert(second.totalOfficialRuns === 2, 'expected official runs to accumulate');
}

function testStreakResetsAfterGap() {
  const previous = {
    ...getEmptyPlayerStats(),
    currentStreak: 4,
    longestStreak: 4,
    lastSubmissionDate: '2026-07-09',
  };
  const reset = updatePlayerStats(previous, '2026-07-12', 300, 2, 12);

  assert(reset.currentStreak === 1, 'expected streak reset after skipped utc days');
  assert(reset.longestStreak === 4, 'expected longest streak to remain');
}

function testPersonalBestSummary() {
  const stats = {
    ...getEmptyPlayerStats(),
    bestScore: 500,
    highestPuzzleReached: 4,
  };
  const summary = buildPersonalBestSummary(stats, 650, 5);

  assert(summary.isNewBestScore === true, 'expected new best score');
  assert(summary.isNewBestPuzzlesSolved === true, 'expected new best puzzle count');
  assert(summary.scoreDelta === 150, 'expected score delta');
  assert(summary.puzzlesDelta === 1, 'expected puzzle delta');
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
