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
  StartRunResponse,
  SubmitRunRequest,
  SubmitRunResponse,
  SubmittedRunSummary,
} from '../../shared/api';
import { generatePuzzlesForSeed } from '../../shared/puzzle';
import { generateSeed } from '../../shared/seed';
import { validateOfficialRunPayload } from '../../shared/officialRunValidation';

type ErrorResponse = {
  status: 'error';
  message: string;
};

const OFFICIAL_RUN_TTL_SECONDS = 60 * 60 * 24 * 2;
const RUN_META_TTL_SECONDS = 60 * 60 * 24 * 14;
const PREVIEW_LIMIT = 5;
const LEADERBOARD_LIMIT = 25;

export const api = new Hono();

api.get('/health', (c) => {
  return c.json<HealthResponse>({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

api.get('/bootstrap', async (c) => {
  const { date, seed } = getCurrentDailySeed();
  const username = await reddit.getCurrentUsername();
  const loggedIn = Boolean(username);

  const [leaderboardPreview, currentRun] = await Promise.all([
    getLeaderboardEntries(date, username ?? null, PREVIEW_LIMIT),
    username ? getSubmittedRunSummary(date, username) : Promise.resolve(null),
  ]);

  return c.json<BootstrapResponse>({
    status: 'ok',
    date,
    seed,
    puzzles: generatePuzzlesForSeed(seed),
    username: username ?? null,
    loggedIn,
    hasSubmittedToday: currentRun !== null,
    canStartOfficial: loggedIn && currentRun === null,
    currentRun,
    leaderboardPreview,
  });
});

api.post('/run/start', async (c) => {
  const { date, seed } = getCurrentDailySeed();
  const username = await reddit.getCurrentUsername();

  if (!username) {
    return c.json<StartRunResponse>({
      status: 'ok',
      mode: 'practice',
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
    date,
    seed,
    runId,
    officialRunAllowed: true,
    reason: null,
  });
});

api.post('/run/submit', async (c) => {
  const username = await reddit.getCurrentUsername();
  const { date, seed } = getCurrentDailySeed();

  if (!username) {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'practice',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'Login required for official submission.',
      leaderboardPreview: await getLeaderboardEntries(date, null, PREVIEW_LIMIT),
    });
  }

  const payload = await c.req.json<SubmitRunRequest>();
  const runKey = getOfficialRunKey(date, username);
  const existingRun = await redis.hGetAll(runKey);

  if (!existingRun.runId || existingRun.runId !== payload.runId || existingRun.status !== 'started') {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'Official run token is missing or invalid.',
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
      leaderboardPreview: await getLeaderboardEntries(date, username, PREVIEW_LIMIT),
    });
  }

  const runMetaKey = getRunMetaKey(date, username);
  const acceptedAt = new Date().toISOString();
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

  return c.json<SubmitRunResponse>({
    status: 'ok',
    accepted: true,
    mode: 'official',
    finalScore: validation.finalScore,
    puzzlesSolved: validation.puzzlesSolved,
    rank,
    reason: null,
    leaderboardPreview,
  });
});

api.get('/leaderboard', async (c) => {
  const { date } = getCurrentDailySeed();
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
      redis.get('count'),
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

  const count = await redis.incrBy('count', 1);
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

  const count = await redis.incrBy('count', -1);
  return c.json<DecrementResponse>({
    count,
    postId,
    type: 'decrement',
  });
});

function getCurrentDailySeed() {
  const date = new Date().toISOString().slice(0, 10);
  return {
    date,
    seed: generateSeed(date),
  };
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

  const rank = await getCurrentUserRank(date, username);
  if (rank === null) return null;

  return {
    score: parseInt(fields.score, 10),
    puzzlesSolved: parseInt(fields.puzzlesSolved, 10),
    rank,
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

async function getLeaderboardEntries(
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
    entries.push({
      rank: index + 1,
      username: item.member,
      score: parseInt(fields.score ?? '0', 10),
      puzzlesSolved: parseInt(fields.puzzlesSolved ?? '0', 10),
      isCurrentUser: currentUsername === item.member,
    });
  }

  return entries;
}
