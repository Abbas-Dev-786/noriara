import { randomUUID } from 'node:crypto';

import { Hono } from 'hono';
import { context, redis, reddit } from '@devvit/web/server';
import type {
  BootstrapResponse,
  DecrementResponse,
  HealthResponse,
  IncrementResponse,
  InitResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  PlayerStats,
  StartRunResponse,
  StatsResponse,
  SubmitRunRequest,
  SubmitRunResponse,
  SubmittedRunSummary,
} from '../../shared/api';
import { generatePuzzlesForSeed } from '../../shared/puzzle';
import { generateSeed } from '../../shared/seed';
import {
  getOfficialRunTelemetryLimitError,
  isOfficialRunSubmissionWindowValid,
  validateOfficialRunPayload,
} from '../../shared/officialRunValidation';
import { buildPersonalBestSummary, getEmptyPlayerStats, updatePlayerStats } from '../../shared/playerStats';
import { createReplayData, type ReplayData, type ReplayResponse, validateReplay } from '../../shared/replay';

type ErrorResponse = {
  status: 'error';
  message: string;
};

const OFFICIAL_RUN_TTL_SECONDS = 60 * 60 * 24 * 2;
const RUN_META_TTL_SECONDS = 60 * 60 * 24 * 30;
const REPLAY_TTL_SECONDS = 60 * 60 * 24 * 30;
const PUBLIC_REPLAY_LIMIT = 10;
const PREVIEW_LIMIT = 5;
const LEADERBOARD_LIMIT = 25;
const DAILY_RUN_VARIANT = 'daily' as const;

import { archive } from './archive';
import { admin } from './admin';
import { event } from './event';
import { community } from './community';

export const api = new Hono();

api.route('/archive', archive);
api.route('/admin', admin);
api.route('/event', event);
api.route('/community', community);

api.get('/health', (c) => {
  return c.json<HealthResponse>({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

api.get('/bootstrap', async (c) => {
  const { date, seed } = await getCurrentDailySeed();
  const username = await reddit.getCurrentUsername();
  const loggedIn = Boolean(username);

  const [leaderboardPreview, currentRun] = await Promise.all([
    getLeaderboardEntries(date, username ?? null, PREVIEW_LIMIT),
    username ? getSubmittedRunSummary(date, username) : Promise.resolve(null),
  ]);
  const playerStats = username ? await getPlayerStats(username) : null;

  return c.json<BootstrapResponse>({
    status: 'ok',
    date,
    seed,
    runVariant: DAILY_RUN_VARIANT,
    puzzles: generatePuzzlesForSeed(seed),
    username: username ?? null,
    loggedIn,
    hasSubmittedToday: currentRun !== null,
    canStartOfficial: loggedIn && currentRun === null,
    currentRun,
    playerStats,
    leaderboardPreview,
  });
});

api.post('/run/start', async (c) => {
  const { date, seed } = await getCurrentDailySeed();
  const username = await reddit.getCurrentUsername();

  if (!username) {
    return c.json<StartRunResponse>({
      status: 'ok',
      mode: 'practice',
      runVariant: DAILY_RUN_VARIANT,
      date,
      seed,
      runId: null,
      officialRunAllowed: false,
      reason: 'Login required for official daily submission.',
    });
  }

  const currentRun = await getSubmittedRunSummary(date, username);
  if (currentRun) {
    return c.json<StartRunResponse>({
      status: 'ok',
      mode: 'practice',
      runVariant: DAILY_RUN_VARIANT,
      date,
      seed,
      runId: null,
      officialRunAllowed: false,
      reason: 'Official run already submitted for today.',
    });
  }

  const runId = randomUUID();
  const runKey = getOfficialRunKey(date, username);
  const startedAt = Date.now();

  await Promise.all([
    redis.hSet(runKey, {
      runId,
      date,
      seed,
      username,
      status: 'started',
      startedAtMs: startedAt.toString(),
      createdAt: new Date(startedAt).toISOString(),
    }),
    redis.expire(runKey, OFFICIAL_RUN_TTL_SECONDS),
  ]);

  return c.json<StartRunResponse>({
    status: 'ok',
    mode: 'official',
    runVariant: DAILY_RUN_VARIANT,
    date,
    seed,
    runId,
    officialRunAllowed: true,
    reason: null,
  });
});

api.post('/run/submit', async (c) => {
  const username = await reddit.getCurrentUsername();
  const payload = await c.req.json<SubmitRunRequest>();
  const { date, seed } = await getCurrentDailySeed();

  if (!username) {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'practice',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'Login required for official submission.',
      replayAvailable: false,
      playerStats: null,
      personalBest: null,
      leaderboardPreview: await getLeaderboardEntries(date, null, PREVIEW_LIMIT),
    });
  }

  const runKey = getOfficialRunKey(date, username);
  const existingRun = await redis.hGetAll(runKey);
  const currentStats = await getPlayerStats(username);

  if (!existingRun.runId || existingRun.runId !== payload.runId || existingRun.status !== 'started') {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'Official run token is missing or invalid.',
      replayAvailable: false,
      playerStats: currentStats,
      personalBest: null,
      leaderboardPreview: await getLeaderboardEntries(date, username, PREVIEW_LIMIT),
    });
  }

  const currentRun = await getSubmittedRunSummary(date, username);
  if (currentRun) {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: currentRun.score,
      puzzlesSolved: currentRun.puzzlesSolved,
      rank: currentRun.rank,
      reason: 'Official run already submitted for today.',
      replayAvailable: Boolean(await getReplay(date, username, username)),
      playerStats: currentStats,
      personalBest: null,
      leaderboardPreview: await getLeaderboardEntries(date, username, PREVIEW_LIMIT),
    });
  }

  if (payload.date !== date || payload.seed !== seed) {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'Daily seed mismatch.',
      replayAvailable: false,
      playerStats: currentStats,
      personalBest: null,
      leaderboardPreview: await getLeaderboardEntries(date, username, PREVIEW_LIMIT),
    });
  }

  if (payload.runVariant !== DAILY_RUN_VARIANT) {
    await redis.hSet(runKey, {
      lastRejectedAt: new Date().toISOString(),
      lastRejectedReason: 'Unsupported run variant.',
    });

    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'Unsupported run variant.',
      replayAvailable: false,
      playerStats: currentStats,
      personalBest: null,
      leaderboardPreview: await getLeaderboardEntries(date, username, PREVIEW_LIMIT),
    });
  }

  const serverStartedAtMs = Number.parseInt(existingRun.startedAtMs ?? '', 10);
  if (!Number.isFinite(serverStartedAtMs) || !isOfficialRunSubmissionWindowValid(serverStartedAtMs, Date.now())) {
    await redis.hSet(runKey, {
      status: 'expired',
      expiredAt: new Date().toISOString(),
      lastRejectedReason: 'Official run token expired before submission.',
    });

    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'Official run token expired before submission.',
      replayAvailable: false,
      playerStats: currentStats,
      personalBest: null,
      leaderboardPreview: await getLeaderboardEntries(date, username, PREVIEW_LIMIT),
    });
  }

  const telemetryLimitError = getOfficialRunTelemetryLimitError(payload.telemetry);
  if (telemetryLimitError) {
    await redis.hSet(runKey, {
      lastRejectedAt: new Date().toISOString(),
      lastRejectedReason: telemetryLimitError,
    });

    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: telemetryLimitError,
      replayAvailable: false,
      playerStats: currentStats,
      personalBest: null,
      leaderboardPreview: await getLeaderboardEntries(date, username, PREVIEW_LIMIT),
    });
  }

  const validation = validateOfficialRunPayload(payload);
  if (!validation.accepted) {
    await redis.hSet(runKey, {
      lastRejectedAt: new Date().toISOString(),
      lastRejectedReason: validation.reason,
    });

    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: validation.reason,
      replayAvailable: false,
      playerStats: currentStats,
      personalBest: null,
      leaderboardPreview: await getLeaderboardEntries(date, username, PREVIEW_LIMIT),
    });
  }

  const claimed = await redis.hSetNX(runKey, 'acceptanceClaimedAt', new Date().toISOString());
  if (claimed !== 1) {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'Official run already submitted for today.',
      replayAvailable: false,
      playerStats: currentStats,
      personalBest: null,
      leaderboardPreview: await getLeaderboardEntries(date, username, PREVIEW_LIMIT),
    });
  }
  await redis.hSet(runKey, {
    status: 'submitting',
  });

  const runMetaKey = getRunMetaKey(date, username);
  const acceptedAt = new Date().toISOString();
  const personalBest = buildPersonalBestSummary(
    currentStats,
    validation.finalScore,
    validation.puzzlesSolved
  );
  const rankScore = makeRankScore(
    validation.finalScore,
    validation.puzzlesSolved,
    validation.lastSolveTimestampMs,
    acceptedAt
  );

  await Promise.all([
    redis.zAdd(getLeaderboardKey(date), {
      member: username,
      score: rankScore,
    }),
    redis.hSet(runMetaKey, {
      score: validation.finalScore.toString(),
      puzzlesSolved: validation.puzzlesSolved.toString(),
      maxCombo: validation.maxCombo.toString(),
      totalRunMs: validation.totalRunMs.toString(),
      lastSolveTimestampMs: validation.lastSolveTimestampMs.toString(),
      acceptedAt,
      validationStatus: 'accepted',
      rankScore: rankScore.toString(),
      runId: payload.runId,
    }),
    redis.expire(runMetaKey, RUN_META_TTL_SECONDS),
    redis.hSet(runKey, {
      status: 'submitted',
      submittedAt: acceptedAt,
    }),
  ]);

  const [rank, leaderboardPreview] = await Promise.all([
    getCurrentUserRank(date, username),
    getLeaderboardEntries(date, username, PREVIEW_LIMIT),
  ]);
  const updatedStats = updatePlayerStats(
    currentStats,
    date,
    validation.finalScore,
    validation.puzzlesSolved,
    rank ?? 1
  );
  const replayData = createReplayData(
    username,
    date,
    seed,
    DAILY_RUN_VARIANT,
    30,
    validation.finalScore,
    validation.puzzlesSolved,
    rank,
    acceptedAt,
    payload.telemetry
  );
  await redis.hSet(getPlayerStatsKey(username), serializePlayerStats(updatedStats));
  let replayAvailable = false;
  if (validateReplay(replayData)) {
    await Promise.all([
      redis.set(getPersonalReplayKey(date, username), JSON.stringify(replayData)),
      redis.expire(getPersonalReplayKey(date, username), REPLAY_TTL_SECONDS),
    ]);
    await syncPublicReplays(date);
    replayAvailable = true;
  }

  return c.json<SubmitRunResponse>({
    status: 'ok',
    accepted: true,
    mode: 'official',
    finalScore: validation.finalScore,
    puzzlesSolved: validation.puzzlesSolved,
    rank,
    reason: null,
    replayAvailable,
    playerStats: updatedStats,
    personalBest,
    leaderboardPreview,
  });
});

api.get('/leaderboard', async (c) => {
  const { date: currentDate } = await getCurrentDailySeed();
  const date = c.req.query('date') ?? currentDate;
  const username = await reddit.getCurrentUsername();
  const [entries, currentUserRank] = await Promise.all([
    getLeaderboardEntries(date, username ?? null, LEADERBOARD_LIMIT),
    username ? getCurrentUserRank(date, username) : Promise.resolve(null),
  ]);

  return c.json<LeaderboardResponse>({
    status: 'ok',
    date,
    entries,
    currentUserRank,
  });
});

api.get('/stats', async (c) => {
  const username = await reddit.getCurrentUsername();
  const playerStats = username ? await getPlayerStats(username) : null;

  return c.json<StatsResponse>({
    status: 'ok',
    playerStats,
  });
});

api.get('/replay/:username', async (c) => {
  const requestedUsername = c.req.param('username');
  const { date: currentDate } = await getCurrentDailySeed();
  const date = c.req.query('date') ?? currentDate;
  const viewerUsername = await reddit.getCurrentUsername();
  const replay = await getReplay(date, requestedUsername, viewerUsername ?? null);

  return c.json<ReplayResponse>({
    status: 'ok',
    replay,
  });
});

api.get('/init', async (c) => {
  const { postId } = context;

  if (!postId) {
    console.error('API Init Error: postId not found in devvit context');
    return c.json<ErrorResponse>(
      {
        status: 'error',
        message: 'postId is required but missing from context',
      },
      400
    );
  }

  try {
    const [count, username] = await Promise.all([
      redis.get(getCountKey(postId)),
      reddit.getCurrentUsername(),
    ]);

    return c.json<InitResponse>({
      type: 'init',
      postId,
      count: count ? parseInt(count, 10) : 0,
      username: username ?? 'anonymous',
    });
  } catch (error) {
    console.error(`API Init Error for post ${postId}:`, error);
    const errorMessage =
      error instanceof Error ? `Initialization failed: ${error.message}` : 'Unknown error during initialization';
    return c.json<ErrorResponse>({ status: 'error', message: errorMessage }, 400);
  }
});

api.post('/increment', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
  }

  const count = await redis.incrBy(getCountKey(postId), 1);
  return c.json<IncrementResponse>({
    count,
    postId,
    type: 'increment',
  });
});

api.post('/decrement', async (c) => {
  const { postId } = context;
  if (!postId) {
    return c.json<ErrorResponse>({ status: 'error', message: 'postId is required' }, 400);
  }

  const count = await redis.incrBy(getCountKey(postId), -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

import type { LiveOpsConfig } from '../../shared/api';

async function getLiveOpsConfig(): Promise<LiveOpsConfig | null> {
  const raw = await redis.get('liveops:config');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LiveOpsConfig;
  } catch {
    return null;
  }
}

async function getCurrentDailySeed() {
  const date = new Date().toISOString().slice(0, 10);
  const liveOps = await getLiveOpsConfig();
  
  if (liveOps?.disabledDates?.includes(date)) {
    return { date, seed: 'DISABLED' }; // Or throw error
  }
  
  const seed = liveOps?.overriddenSeeds?.[date] ?? generateSeed(date);
  
  return { date, seed };
}

function getLeaderboardKey(date: string) {
  return `daily:${date}:leaderboard`;
}

function getRunMetaKey(date: string, username: string) {
  return `daily:${date}:runs:${username}`;
}

function getOfficialRunKey(date: string, username: string) {
  return `officialRun:${date}:${username}`;
}

function getPlayerStatsKey(username: string) {
  return `playerStats:${username}`;
}

function getPersonalReplayKey(date: string, username: string) {
  return `daily:${date}:replay:self:${username}`;
}

function getPublicReplayKey(date: string, username: string) {
  return `daily:${date}:replay:public:${username}`;
}

function getPublicReplaySetKey(date: string) {
  return `daily:${date}:replay:public:set`;
}

function getCountKey(postId: string) {
  return `post:${postId}:count`;
}

function makeRankScore(
  finalScore: number,
  puzzlesSolved: number,
  lastSolveTimestampMs: number,
  acceptedAtIso: string
) {
  const scoreWeight = finalScore * 10_000_000_000;
  const puzzleWeight = puzzlesSolved * 100_000_000;
  const finishWeight = Math.max(0, 100_000 - Math.min(lastSolveTimestampMs, 100_000)) * 1_000;
  const submissionWeight = 86_400_000 - getUtcMillisIntoDay(acceptedAtIso);
  return scoreWeight + puzzleWeight + finishWeight + submissionWeight;
}

function getUtcMillisIntoDay(isoTimestamp: string) {
  const timestamp = new Date(isoTimestamp);
  return (
    timestamp.getUTCHours() * 3_600_000 +
    timestamp.getUTCMinutes() * 60_000 +
    timestamp.getUTCSeconds() * 1_000 +
    timestamp.getUTCMilliseconds()
  );
}

async function getSubmittedRunSummary(date: string, username: string): Promise<SubmittedRunSummary | null> {
  const fields = await redis.hGetAll(getRunMetaKey(date, username));
  if (!fields.score || !fields.puzzlesSolved || !fields.acceptedAt) {
    return null;
  }

  const [rank, hasReplay] = await Promise.all([
    getCurrentUserRank(date, username),
    redis.exists(getPersonalReplayKey(date, username)),
  ]);
  if (rank === null) return null;

  return {
    score: parseInt(fields.score, 10),
    puzzlesSolved: parseInt(fields.puzzlesSolved, 10),
    rank,
    hasReplay: hasReplay === 1,
    acceptedAt: fields.acceptedAt,
  };
}

async function getCurrentUserRank(date: string, username: string): Promise<number | null> {
  const [ascendingRank, totalEntries] = await Promise.all([
    redis.zRank(getLeaderboardKey(date), username),
    redis.zCard(getLeaderboardKey(date)),
  ]);

  if (ascendingRank === undefined || totalEntries === 0) {
    return null;
  }

  return totalEntries - ascendingRank;
}

export async function getLeaderboardEntries(
  date: string,
  currentUsername: string | null,
  limit: number
): Promise<LeaderboardEntry[]> {
  const ranked = await redis.zRange(getLeaderboardKey(date), 0, Math.max(0, limit - 1), {
    by: 'rank',
    reverse: true,
  });

  const entries: LeaderboardEntry[] = [];

  for (let index = 0; index < ranked.length; index++) {
    const item = ranked[index]!;
    const fields = await redis.hGetAll(getRunMetaKey(date, item.member));
    const hasReplay = await hasReplayAccess(date, item.member, currentUsername);
    entries.push({
      rank: index + 1,
      username: item.member,
      score: parseInt(fields.score ?? '0', 10),
      puzzlesSolved: parseInt(fields.puzzlesSolved ?? '0', 10),
      hasReplay,
      isCurrentUser: currentUsername === item.member,
    });
  }

  return entries;
}

async function getPlayerStats(username: string): Promise<PlayerStats | null> {
  const fields = await redis.hGetAll(getPlayerStatsKey(username));
  if (!fields.lastSubmissionDate && !fields.totalOfficialRuns) {
    return null;
  }

  const defaults = getEmptyPlayerStats();
  return {
    currentStreak: parseInt(fields.currentStreak ?? defaults.currentStreak.toString(), 10),
    longestStreak: parseInt(fields.longestStreak ?? defaults.longestStreak.toString(), 10),
    bestScore: parseInt(fields.bestScore ?? defaults.bestScore.toString(), 10),
    bestRank: fields.bestRank ? parseInt(fields.bestRank, 10) : null,
    highestPuzzleReached: parseInt(fields.highestPuzzleReached ?? defaults.highestPuzzleReached.toString(), 10),
    totalOfficialRuns: parseInt(fields.totalOfficialRuns ?? defaults.totalOfficialRuns.toString(), 10),
    totalPuzzlesSolved: parseInt(fields.totalPuzzlesSolved ?? defaults.totalPuzzlesSolved.toString(), 10),
    lastSubmissionDate: fields.lastSubmissionDate ?? null,
  };
}

function serializePlayerStats(stats: PlayerStats): Record<string, string> {
  return {
    currentStreak: stats.currentStreak.toString(),
    longestStreak: stats.longestStreak.toString(),
    bestScore: stats.bestScore.toString(),
    bestRank: stats.bestRank === null ? '' : stats.bestRank.toString(),
    highestPuzzleReached: stats.highestPuzzleReached.toString(),
    totalOfficialRuns: stats.totalOfficialRuns.toString(),
    totalPuzzlesSolved: stats.totalPuzzlesSolved.toString(),
    lastSubmissionDate: stats.lastSubmissionDate ?? '',
  };
}

async function getReplay(date: string, username: string, viewerUsername: string | null): Promise<ReplayData | null> {
  const raw =
    viewerUsername === username
      ? ((await redis.get(getPersonalReplayKey(date, username))) ?? (await redis.get(getPublicReplayKey(date, username))))
      : await redis.get(getPublicReplayKey(date, username));
  if (!raw) return null;

  try {
    const replay = JSON.parse(raw) as ReplayData;
    return validateReplay(replay) ? replay : null;
  } catch {
    return null;
  }
}

async function hasReplayAccess(date: string, replayUsername: string, viewerUsername: string | null): Promise<boolean> {
  if (viewerUsername === replayUsername) {
    const personal = await redis.get(getPersonalReplayKey(date, replayUsername));
    if (personal) return true;
  }

  const publicReplay = await redis.get(getPublicReplayKey(date, replayUsername));
  return Boolean(publicReplay);
}

async function syncPublicReplays(date: string): Promise<void> {
  const topEntries = await redis.zRange(getLeaderboardKey(date), 0, PUBLIC_REPLAY_LIMIT - 1, {
    by: 'rank',
    reverse: true,
  });
  const topUsernames = topEntries.map((entry) => entry.member);
  const previousPublic = await getPublicReplayUsernames(date);

  for (const username of topUsernames) {
    const personalReplay = await redis.get(getPersonalReplayKey(date, username));
    if (!personalReplay) continue;

    await Promise.all([
      redis.set(getPublicReplayKey(date, username), personalReplay),
      redis.expire(getPublicReplayKey(date, username), REPLAY_TTL_SECONDS),
    ]);
  }

  for (const username of previousPublic) {
    if (topUsernames.includes(username)) continue;
    await Promise.all([
      redis.del(getPublicReplayKey(date, username)),
    ]);
  }

  await Promise.all([
    redis.set(getPublicReplaySetKey(date), JSON.stringify(topUsernames)),
    redis.expire(getPublicReplaySetKey(date), REPLAY_TTL_SECONDS),
  ]);
}

async function getPublicReplayUsernames(date: string): Promise<string[]> {
  const raw = await redis.get(getPublicReplaySetKey(date));
  if (!raw) return [];

  try {
    const usernames = JSON.parse(raw) as string[];
    return Array.isArray(usernames) ? usernames : [];
  } catch {
    return [];
  }
}
