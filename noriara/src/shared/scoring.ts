export interface ScoreResult {
  score: number;
  puzzlesSolved: number;
  timeRemaining: number;
}

export function calculateScore(solvedCount: number, timeRemaining: number): ScoreResult {
  return {
    score: solvedCount * 100,
    puzzlesSolved: solvedCount,
    timeRemaining,
  };
}
