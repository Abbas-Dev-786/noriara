import type { PuzzleLayout, PuzzleShape } from './puzzle';

export type HealthResponse = {
  status: 'ok';
  timestamp: string;
};

export type RunMode = 'official' | 'practice';
export type RunVariant = 'daily' | 'event' | 'community' | 'practiceSandbox';
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
  generatorVersion: number;
  mechanics: string[];
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
  dailyAvailable: boolean;
  unavailableReason: string | null;
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

export type ArchivedDailySummary = {
  date: string;
  seed: string;
  generatorVersion: number;
  winnerUsername: string | null;
  winnerScore: number;
  winnerReplayAvailable: boolean;
  totalRuns: number;
};

export type ArchiveListResponse = {
  status: 'ok';
  dates: string[];
};

export type ArchiveDateResponse = {
  status: 'ok';
  date: string;
  summary: ArchivedDailySummary | null;
  leaderboard: LeaderboardEntry[];
};

export type LiveOpsConfig = {
  disabledDates: string[];
  overriddenSeeds: Record<string, string>;
  featuredLayoutIds: string[];
  seasonId: string | null;
  activeEventId: string | null;
};

export type EventConfig = {
  eventId: string;
  label: string;
  startDate: string;
  endDate: string;
  seed: string;
  timerMs: number;
  puzzleCount: number;
  allowedMechanics: string[];
};

export type SeasonConfig = {
  seasonId: string;
  label: string;
  startDate: string;
  endDate: string;
  allowedMechanics: Record<RunVariant, string[]>;
  theme: Record<string, string>;
};

export type EventCurrentResponse = {
  status: 'ok';
  activeEvent: EventConfig | null;
  currentRun: SubmittedRunSummary | null;
  leaderboardPreview: LeaderboardEntry[];
};

export type CommunityLayoutStatus = 'submitted' | 'rejected' | 'approved' | 'featured' | 'retired';

export type CommunityLayoutDiagnostics = {
  issues: string[];
  previewTargetCount: number;
  previewHazardCount: number;
  previewArchetype: string | null;
  generatorVersion: number;
};

export type CommunityLayout = {
  layoutId: string;
  authorUsername: string;
  title: string;
  note: string;
  seed: string;
  mechanics: string[];
  targets: PuzzleShape[];
  hazards: PuzzleShape[];
  generatorVersion: number;
  upvotes: number;
  submittedAt: string;
  updatedAt: string;
  status: CommunityLayoutStatus;
  rejectionReason: string | null;
  validatorDiagnostics: CommunityLayoutDiagnostics;
  featuredAt: string | null;
  retiredAt: string | null;
  isFeatured: boolean;
};

export type CommunityListResponse = {
  status: 'ok';
  layouts: CommunityLayout[];
};

export type CommunitySubmitRequest = {
  title: string;
  note: string;
  seed: string;
  mechanics: string[];
};

export type CommunitySubmitResponse = {
  status: 'ok';
  layout: CommunityLayout;
};

export type CommunityMineResponse = {
  status: 'ok';
  layouts: CommunityLayout[];
};

export type AdminCommunityListResponse = {
  status: 'ok';
  layouts: CommunityLayout[];
};
