import type { PersonalBestSummary, PlayerStats } from './api';

export function getEmptyPlayerStats(): PlayerStats {
  return {
    currentStreak: 0,
    longestStreak: 0,
    bestScore: 0,
    bestRank: null,
    highestPuzzleReached: 0,
    totalOfficialRuns: 0,
    totalPuzzlesSolved: 0,
    lastSubmissionDate: null,
  };
}

export function updatePlayerStats(
  currentStats: PlayerStats | null,
  submissionDate: string,
  finalScore: number,
  puzzlesSolved: number,
  rank: number
): PlayerStats {
  const previous = currentStats ?? getEmptyPlayerStats();
  const nextStreak = computeNextStreak(previous.lastSubmissionDate, submissionDate, previous.currentStreak);

  return {
    currentStreak: nextStreak,
    longestStreak: Math.max(previous.longestStreak, nextStreak),
    bestScore: Math.max(previous.bestScore, finalScore),
    bestRank: previous.bestRank === null ? rank : Math.min(previous.bestRank, rank),
    highestPuzzleReached: Math.max(previous.highestPuzzleReached, puzzlesSolved),
    totalOfficialRuns: previous.totalOfficialRuns + 1,
    totalPuzzlesSolved: previous.totalPuzzlesSolved + puzzlesSolved,
    lastSubmissionDate: submissionDate,
  };
}

export function buildPersonalBestSummary(
  currentStats: PlayerStats | null,
  finalScore: number,
  puzzlesSolved: number
): PersonalBestSummary {
  const previousBestScore = currentStats?.bestScore ?? null;
  const previousBestPuzzlesSolved = currentStats?.highestPuzzleReached ?? null;

  return {
    previousBestScore,
    previousBestPuzzlesSolved,
    isNewBestScore: previousBestScore === null || finalScore > previousBestScore,
    isNewBestPuzzlesSolved: previousBestPuzzlesSolved === null || puzzlesSolved > previousBestPuzzlesSolved,
    scoreDelta: previousBestScore === null ? null : finalScore - previousBestScore,
    puzzlesDelta: previousBestPuzzlesSolved === null ? null : puzzlesSolved - previousBestPuzzlesSolved,
  };
}

export function computeNextStreak(
  previousDate: string | null,
  submissionDate: string,
  currentStreak: number
): number {
  if (!previousDate) {
    return 1;
  }

  const dayGap = diffUtcDays(previousDate, submissionDate);

  if (dayGap <= 0) {
    return Math.max(currentStreak, 1);
  }

  if (dayGap === 1) {
    return currentStreak + 1;
  }

  return 1;
}

export function diffUtcDays(fromDate: string, toDate: string): number {
  const from = Date.parse(`${fromDate}T00:00:00.000Z`);
  const to = Date.parse(`${toDate}T00:00:00.000Z`);
  return Math.round((to - from) / 86_400_000);
}
