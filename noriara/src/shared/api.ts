import type { PuzzleLayout } from './puzzle';

export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
};

export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};

export type HealthResponse = {
  status: 'ok';
  timestamp: string;
};

export type RunMode = 'official' | 'practice';
export type RunVariant = 'daily';
export type FailureReason = 'hazard' | 'escape';

export type GesturePointSample = {
  x: number;
  y: number;
  t: number;
};

export type GestureAttempt = {
  puzzleIndex: number;
  startedAtMs: number;
  releaseTimestampMs: number;
  pointCount: number;
  pathLength: number;
  points: GesturePointSample[];
  outcome: 'success' | 'failure';
};

export type SolveEvent = {
  puzzleIndex: number;
  solveTimeMs: number;
  timestampMs: number;
};

export type FailureEvent = {
  puzzleIndex: number;
  timestampMs: number;
  reason: FailureReason;
};

export type RunClientSummary = {
  score: number;
  puzzlesSolved: number;
  maxCombo: number;
  totalRunMs: number;
};

export type RunTelemetry = {
  attempts: GestureAttempt[];
  solveEvents: SolveEvent[];
  failureEvents: FailureEvent[];
  summary: RunClientSummary;
};

export type SubmittedRunSummary = {
  score: number;
  puzzlesSolved: number;
  rank: number;
  hasReplay: boolean;
  acceptedAt: string;
};

export type PlayerStats = {
  currentStreak: number;
  longestStreak: number;
  bestScore: number;
  bestRank: number | null;
  highestPuzzleReached: number;
  totalOfficialRuns: number;
  totalPuzzlesSolved: number;
  lastSubmissionDate: string | null;
};

export type PersonalBestSummary = {
  previousBestScore: number | null;
  previousBestPuzzlesSolved: number | null;
  isNewBestScore: boolean;
  isNewBestPuzzlesSolved: boolean;
  scoreDelta: number | null;
  puzzlesDelta: number | null;
};

export type LeaderboardEntry = {
  rank: number;
  username: string;
  score: number;
  puzzlesSolved: number;
  hasReplay: boolean;
  isCurrentUser: boolean;
};

export type BootstrapResponse = {
  status: 'ok';
  date: string;
  seed: string;
  runVariant: RunVariant;
  puzzles: PuzzleLayout[];
  username: string | null;
  loggedIn: boolean;
  hasSubmittedToday: boolean;
  canStartOfficial: boolean;
  currentRun: SubmittedRunSummary | null;
  playerStats: PlayerStats | null;
  leaderboardPreview: LeaderboardEntry[];
};

export type StartRunResponse = {
  status: 'ok';
  mode: RunMode;
  runVariant: RunVariant;
  date: string;
  seed: string;
  runId: string | null;
  officialRunAllowed: boolean;
  reason: string | null;
};

export type SubmitRunRequest = {
  runId: string;
  date: string;
  seed: string;
  runVariant: RunVariant;
  telemetry: RunTelemetry;
};

export type SubmitRunResponse = {
  status: 'ok';
  accepted: boolean;
  mode: RunMode;
  finalScore: number;
  puzzlesSolved: number;
  rank: number | null;
  reason: string | null;
  replayAvailable: boolean;
  playerStats: PlayerStats | null;
  personalBest: PersonalBestSummary | null;
  leaderboardPreview: LeaderboardEntry[];
};

export type LeaderboardResponse = {
  status: 'ok';
  date: string;
  entries: LeaderboardEntry[];
  currentUserRank: number | null;
};

export type StatsResponse = {
  status: 'ok';
  playerStats: PlayerStats | null;
};
