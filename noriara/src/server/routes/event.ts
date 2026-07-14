import { randomUUID } from 'node:crypto';
import { Hono } from 'hono';
import { redis, reddit } from '@devvit/web/server';
import type {
  EventConfig,
  EventCurrentResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  StartRunResponse,
  SubmitRunRequest,
  SubmitRunResponse,
  SubmittedRunSummary,
} from '../../shared/api';
import {
  getOfficialRunTelemetryLimitError,
  isOfficialRunSubmissionWindowValid,
  validateOfficialRunPayload,
} from '../../shared/officialRunValidation';
import { createReplayData, type ReplayResponse, validateReplay } from '../../shared/replay';

export const event = new Hono();

const EVENT_RUN_VARIANT = 'event' as const;
const EVENT_RUN_TTL_SECONDS = 60 * 60 * 24 * 7;
const EVENT_REPLAY_TTL_SECONDS = 60 * 60 * 24 * 30;
const EVENT_PUBLIC_REPLAY_LIMIT = 10;
const PREVIEW_LIMIT = 5;

event.get('/current', async (c) => {
  const activeEvent = await getActiveEvent();
  const username = await reddit.getCurrentUsername();
  let currentRun: SubmittedRunSummary | null = null;
  let leaderboardPreview: LeaderboardEntry[] = [];

  if (activeEvent) {
    leaderboardPreview = await getEventLeaderboardEntries(activeEvent.eventId, username ?? null, PREVIEW_LIMIT);
    if (username) {
      currentRun = await getEventSubmittedRunSummary(activeEvent.eventId, username, username);
    }
  }

  return c.json<EventCurrentResponse>({
    status: 'ok',
    activeEvent,
    currentRun,
    leaderboardPreview,
  });
});

event.post('/start', async (c) => {
  const activeEvent = await getActiveEvent();
  const username = await reddit.getCurrentUsername();

  if (!activeEvent) {
    return c.json<StartRunResponse>({
      status: 'ok',
      mode: 'practice',
      runVariant: EVENT_RUN_VARIANT,
      date: new Date().toISOString().slice(0, 10),
      seed: '',
      runId: null,
      officialRunAllowed: false,
      reason: 'No active event.',
    });
  }

  if (!username) {
    return c.json<StartRunResponse>({
      status: 'ok',
      mode: 'practice',
      runVariant: EVENT_RUN_VARIANT,
      date: activeEvent.eventId,
      seed: activeEvent.seed,
      runId: null,
      officialRunAllowed: false,
      reason: 'Login required for event participation.',
    });
  }

  const currentRun = await getEventSubmittedRunSummary(activeEvent.eventId, username, username);
  if (currentRun) {
    return c.json<StartRunResponse>({
      status: 'ok',
      mode: 'practice',
      runVariant: EVENT_RUN_VARIANT,
      date: activeEvent.eventId,
      seed: activeEvent.seed,
      runId: null,
      officialRunAllowed: false,
      reason: 'Event run already submitted.',
    });
  }

  const runId = randomUUID();
  const runKey = getEventRunKey(activeEvent.eventId, username);
  const startedAt = Date.now();

  await Promise.all([
    redis.hSet(runKey, {
      runId,
      eventId: activeEvent.eventId,
      seed: activeEvent.seed,
      username,
      status: 'started',
      timerMs: activeEvent.timerMs.toString(),
      puzzleCount: activeEvent.puzzleCount.toString(),
      startedAtMs: startedAt.toString(),
      createdAt: new Date(startedAt).toISOString(),
    }),
    redis.expire(runKey, EVENT_RUN_TTL_SECONDS),
  ]);

  return c.json<StartRunResponse>({
    status: 'ok',
    mode: 'official',
    runVariant: EVENT_RUN_VARIANT,
    date: activeEvent.eventId,
    seed: activeEvent.seed,
    runId,
    officialRunAllowed: true,
    reason: null,
  });
});

event.post('/submit', async (c) => {
  const username = await reddit.getCurrentUsername();
  const payload = await c.req.json<SubmitRunRequest>();
  const activeEvent = await getActiveEvent();

  if (!username || !activeEvent) {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'practice',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'No active event or not logged in.',
      replayAvailable: false,
      playerStats: null,
      personalBest: null,
      leaderboardPreview: [],
    });
  }

  const runKey = getEventRunKey(activeEvent.eventId, username);
  const existingRun = await redis.hGetAll(runKey);
  if (!existingRun.runId || existingRun.runId !== payload.runId || existingRun.status !== 'started') {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason: 'Event run token is missing or invalid.',
      replayAvailable: false,
      playerStats: null,
      personalBest: null,
      leaderboardPreview: await getEventLeaderboardEntries(activeEvent.eventId, username, PREVIEW_LIMIT),
    });
  }

  const currentRun = await getEventSubmittedRunSummary(activeEvent.eventId, username, username);
  if (currentRun) {
    return c.json<SubmitRunResponse>({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: currentRun.score,
      puzzlesSolved: currentRun.puzzlesSolved,
      rank: currentRun.rank,
      reason: 'Event run already submitted.',
      replayAvailable: currentRun.hasReplay,
      playerStats: null,
      personalBest: null,
      leaderboardPreview: await getEventLeaderboardEntries(activeEvent.eventId, username, PREVIEW_LIMIT),
    });
  }

  if (payload.runVariant !== EVENT_RUN_VARIANT) {
    return rejectEventRun(runKey, username, activeEvent.eventId, 'Unsupported run variant.');
  }
  if (payload.date !== activeEvent.eventId || payload.seed !== activeEvent.seed) {
    return rejectEventRun(runKey, username, activeEvent.eventId, 'Event seed mismatch.');
  }

  const serverStartedAtMs = Number.parseInt(existingRun.startedAtMs ?? '', 10);
  if (!Number.isFinite(serverStartedAtMs) || !isOfficialRunSubmissionWindowValid(serverStartedAtMs, Date.now(), activeEvent.timerMs)) {
    await redis.hSet(runKey, {
      status: 'expired',
      expiredAt: new Date().toISOString(),
      lastRejectedReason: 'Event run token expired before submission.',
    });
    return rejectEventRun(runKey, username, activeEvent.eventId, 'Event run token expired before submission.');
  }

  const telemetryLimitError = getOfficialRunTelemetryLimitError(payload.telemetry);
  if (telemetryLimitError) {
    return rejectEventRun(runKey, username, activeEvent.eventId, telemetryLimitError);
  }

  const validation = validateOfficialRunPayload(payload, {
    maxDurationMs: activeEvent.timerMs + 1_000,
    puzzleCount: activeEvent.puzzleCount,
    isEvent: true,
    allowedMechanics: activeEvent.allowedMechanics.length > 0 ? activeEvent.allowedMechanics : ['core'],
  });
  if (!validation.accepted) {
    return rejectEventRun(runKey, username, activeEvent.eventId, validation.reason);
  }

  const claimed = await redis.hSetNX(runKey, 'acceptanceClaimedAt', new Date().toISOString());
  if (claimed !== 1) {
    return rejectEventRun(runKey, username, activeEvent.eventId, 'Event run already submitted.');
  }
  await redis.hSet(runKey, {
    status: 'submitting',
  });

  const acceptedAt = new Date().toISOString();
  const runMetaKey = getEventRunMetaKey(activeEvent.eventId, username);
  const rankScore = makeEventRankScore(
    validation.finalScore,
    validation.puzzlesSolved,
    validation.lastSolveTimestampMs,
    acceptedAt
  );

  await Promise.all([
    redis.zAdd(getEventLeaderboardKey(activeEvent.eventId), { member: username, score: rankScore }),
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
    redis.hSet(runKey, {
      status: 'submitted',
      submittedAt: acceptedAt,
    }),
  ]);

  const rank = await getEventCurrentUserRank(activeEvent.eventId, username);
  const replayData = createReplayData(
    username,
    activeEvent.eventId,
    activeEvent.seed,
    EVENT_RUN_VARIANT,
    activeEvent.puzzleCount,
    validation.finalScore,
    validation.puzzlesSolved,
    rank,
    acceptedAt,
    payload.telemetry
  );
  let replayAvailable = false;
  if (validateReplay(replayData)) {
    await Promise.all([
      redis.set(getEventPersonalReplayKey(activeEvent.eventId, username), JSON.stringify(replayData)),
      redis.expire(getEventPersonalReplayKey(activeEvent.eventId, username), EVENT_REPLAY_TTL_SECONDS),
    ]);
    await syncPublicEventReplays(activeEvent.eventId);
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
    playerStats: null,
    personalBest: null,
    leaderboardPreview: await getEventLeaderboardEntries(activeEvent.eventId, username, PREVIEW_LIMIT),
  });
});

event.get('/leaderboard', async (c) => {
  const activeEvent = await getActiveEvent();
  const eventId = c.req.query('eventId') ?? activeEvent?.eventId;
  if (!eventId) return c.json({ status: 'error', message: 'eventId is required' }, 400);

  const username = await reddit.getCurrentUsername();
  const entries = await getEventLeaderboardEntries(eventId, username ?? null, 50);

  return c.json<LeaderboardResponse>({
    status: 'ok',
    date: eventId,
    entries,
    currentUserRank: await getEventCurrentUserRank(eventId, username ?? ''),
  });
});

event.get('/replay/:username', async (c) => {
  const activeEvent = await getActiveEvent();
  const eventId = c.req.query('eventId') ?? activeEvent?.eventId;
  if (!eventId) {
    return c.json<ReplayResponse>({
      status: 'ok',
      replay: null,
    });
  }

  const requestedUsername = c.req.param('username');
  const viewerUsername = await reddit.getCurrentUsername();
  const replay = await getEventReplay(eventId, requestedUsername, viewerUsername ?? null);
  return c.json<ReplayResponse>({
    status: 'ok',
    replay,
  });
});

async function rejectEventRun(runKey: string, username: string, eventId: string, reason: string) {
  await redis.hSet(runKey, {
    lastRejectedAt: new Date().toISOString(),
    lastRejectedReason: reason,
  });
  return new Response(
    JSON.stringify({
      status: 'ok',
      accepted: false,
      mode: 'official',
      finalScore: 0,
      puzzlesSolved: 0,
      rank: null,
      reason,
      replayAvailable: false,
      playerStats: null,
      personalBest: null,
      leaderboardPreview: await getEventLeaderboardEntries(eventId, username, PREVIEW_LIMIT),
    } satisfies SubmitRunResponse),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

async function getActiveEvent(): Promise<EventConfig | null> {
  const liveopsStr = await redis.get('liveops:config');
  if (!liveopsStr) return null;

  try {
    const liveops = JSON.parse(liveopsStr) as { activeEventId?: string | null };
    const activeEventId = liveops.activeEventId;
    if (!activeEventId) return null;

    const configStr = await redis.get(getEventConfigKey(activeEventId));
    if (!configStr) return null;

    const config = JSON.parse(configStr) as EventConfig;
    return isEventActiveOnDate(config, new Date().toISOString().slice(0, 10)) ? config : null;
  } catch {
    return null;
  }
}

function isEventActiveOnDate(eventConfig: EventConfig, date: string): boolean {
  return date >= eventConfig.startDate && date <= eventConfig.endDate;
}

async function getEventLeaderboardEntries(
  eventId: string,
  currentUsername: string | null,
  limit: number
): Promise<LeaderboardEntry[]> {
  const ranked = await redis.zRange(getEventLeaderboardKey(eventId), 0, Math.max(0, limit - 1), {
    by: 'rank',
    reverse: true,
  });

  const entries: LeaderboardEntry[] = [];
  for (let index = 0; index < ranked.length; index++) {
    const item = ranked[index]!;
    const fields = await redis.hGetAll(getEventRunMetaKey(eventId, item.member));
    const hasReplay = await hasEventReplayAccess(eventId, item.member, currentUsername);
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

async function getEventSubmittedRunSummary(
  eventId: string,
  username: string,
  viewerUsername: string | null
): Promise<SubmittedRunSummary | null> {
  const fields = await redis.hGetAll(getEventRunMetaKey(eventId, username));
  if (!fields.score || !fields.puzzlesSolved || !fields.acceptedAt) {
    return null;
  }

  const [rank, hasReplay] = await Promise.all([
    getEventCurrentUserRank(eventId, username),
    hasEventReplayAccess(eventId, username, viewerUsername),
  ]);
  if (rank === null) return null;

  return {
    score: parseInt(fields.score, 10),
    puzzlesSolved: parseInt(fields.puzzlesSolved, 10),
    rank,
    hasReplay,
    acceptedAt: fields.acceptedAt,
  };
}

async function getEventCurrentUserRank(eventId: string, username: string): Promise<number | null> {
  if (!username) return null;
  const [ascendingRank, totalEntries] = await Promise.all([
    redis.zRank(getEventLeaderboardKey(eventId), username),
    redis.zCard(getEventLeaderboardKey(eventId)),
  ]);

  if (ascendingRank === undefined || totalEntries === 0) {
    return null;
  }

  return totalEntries - ascendingRank;
}

async function getEventReplay(eventId: string, username: string, viewerUsername: string | null) {
  const raw =
    viewerUsername === username
      ? ((await redis.get(getEventPersonalReplayKey(eventId, username))) ??
        (await redis.get(getEventPublicReplayKey(eventId, username))))
      : await redis.get(getEventPublicReplayKey(eventId, username));
  if (!raw) return null;

  try {
    const replay = JSON.parse(raw);
    return validateReplay(replay) ? replay : null;
  } catch {
    return null;
  }
}

async function hasEventReplayAccess(eventId: string, replayUsername: string, viewerUsername: string | null) {
  if (viewerUsername === replayUsername) {
    const personal = await redis.get(getEventPersonalReplayKey(eventId, replayUsername));
    if (personal) return true;
  }

  return Boolean(await redis.get(getEventPublicReplayKey(eventId, replayUsername)));
}

async function syncPublicEventReplays(eventId: string): Promise<void> {
  const topEntries = await redis.zRange(getEventLeaderboardKey(eventId), 0, EVENT_PUBLIC_REPLAY_LIMIT - 1, {
    by: 'rank',
    reverse: true,
  });
  const topUsernames = topEntries.map((entry) => entry.member);
  const previousPublic = await getPublicEventReplayUsernames(eventId);

  for (const username of topUsernames) {
    const personalReplay = await redis.get(getEventPersonalReplayKey(eventId, username));
    if (!personalReplay) continue;

    await Promise.all([
      redis.set(getEventPublicReplayKey(eventId, username), personalReplay),
      redis.expire(getEventPublicReplayKey(eventId, username), EVENT_REPLAY_TTL_SECONDS),
    ]);
  }

  for (const username of previousPublic) {
    if (topUsernames.includes(username)) continue;
    await redis.del(getEventPublicReplayKey(eventId, username));
  }

  await Promise.all([
    redis.set(getEventPublicReplaySetKey(eventId), JSON.stringify(topUsernames)),
    redis.expire(getEventPublicReplaySetKey(eventId), EVENT_REPLAY_TTL_SECONDS),
  ]);
}

async function getPublicEventReplayUsernames(eventId: string): Promise<string[]> {
  const raw = await redis.get(getEventPublicReplaySetKey(eventId));
  if (!raw) return [];

  try {
    const usernames = JSON.parse(raw) as string[];
    return Array.isArray(usernames) ? usernames : [];
  } catch {
    return [];
  }
}

function makeEventRankScore(
  finalScore: number,
  puzzlesSolved: number,
  lastSolveTimestampMs: number,
  acceptedAtIso: string
) {
  const scoreWeight = finalScore * 10_000_000_000;
  const puzzleWeight = puzzlesSolved * 100_000_000;
  const finishWeight = Math.max(0, 100_000 - Math.min(lastSolveTimestampMs, 100_000)) * 1_000;
  const timestamp = new Date(acceptedAtIso);
  const submissionWeight =
    86_400_000 -
    (timestamp.getUTCHours() * 3_600_000 +
      timestamp.getUTCMinutes() * 60_000 +
      timestamp.getUTCSeconds() * 1_000 +
      timestamp.getUTCMilliseconds());
  return scoreWeight + puzzleWeight + finishWeight + submissionWeight;
}

function getEventConfigKey(eventId: string) {
  return `event:${eventId}:config`;
}

function getEventLeaderboardKey(eventId: string) {
  return `event:${eventId}:leaderboard`;
}

function getEventRunMetaKey(eventId: string, username: string) {
  return `event:${eventId}:runs:${username}`;
}

function getEventRunKey(eventId: string, username: string) {
  return `eventRun:${eventId}:${username}`;
}

function getEventPersonalReplayKey(eventId: string, username: string) {
  return `event:${eventId}:replay:self:${username}`;
}

function getEventPublicReplayKey(eventId: string, username: string) {
  return `event:${eventId}:replay:public:${username}`;
}

function getEventPublicReplaySetKey(eventId: string) {
  return `event:${eventId}:replay:public:set`;
}
