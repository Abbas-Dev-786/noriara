import { Hono } from 'hono';
import { redis, reddit } from '@devvit/web/server';
import type { AdminCommunityListResponse, CommunityLayout, LiveOpsConfig } from '../../shared/api';
import { generatePuzzlesForSeed } from '../../shared/puzzle';
import { generateSeed } from '../../shared/seed';
import { getAllCommunityLayouts, getCommunityLayoutById, writeCommunityLayout } from './community';

export const admin = new Hono();

const ARCHIVE_INDEX_KEY = 'archive:daily:index';
const DAILY_LEADERBOARD_LIMIT = 100;
const ADMIN_USERNAMES_KEY = 'admin:usernames';

admin.get('/community/layouts', async (c) => {
  try {
    await requireAdmin();
    const status = c.req.query('status');
    const layouts = await getAllCommunityLayouts();
    return c.json<AdminCommunityListResponse>({
      status: 'ok',
      layouts: status ? layouts.filter((layout) => layout.status === status) : layouts,
    });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 401);
  }
});

admin.post('/community/layouts/:id/approve', async (c) => {
  return mutateCommunityLayout(c.req.param('id'), async (layout) => {
    const body = await c.req.json<{ featured?: boolean }>().catch(() => ({ featured: false }));
    const timestamp = new Date().toISOString();
    return {
      ...layout,
      status: body.featured ? 'featured' : 'approved',
      isFeatured: body.featured === true,
      rejectionReason: null,
      featuredAt: body.featured ? timestamp : null,
      retiredAt: null,
      updatedAt: timestamp,
    };
  });
});

admin.post('/community/layouts/:id/reject', async (c) => {
  return mutateCommunityLayout(c.req.param('id'), async (layout) => {
    const body = await c.req.json<{ reason?: string }>().catch(() => ({ reason: '' }));
    const reason = body.reason?.trim();
    if (!reason) {
      throw new Error('Rejection reason is required.');
    }
    return {
      ...layout,
      status: 'rejected',
      isFeatured: false,
      rejectionReason: reason,
      featuredAt: null,
      retiredAt: null,
      updatedAt: new Date().toISOString(),
    };
  });
});

admin.post('/community/layouts/:id/retire', async (c) => {
  return mutateCommunityLayout(c.req.param('id'), async (layout) => ({
    ...layout,
    status: 'retired',
    isFeatured: false,
    featuredAt: null,
    retiredAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));
});

admin.post('/archive-yesterday', async (c) => {
  try {
    await requireAdmin();
    const date = getUtcDateOffset(-1);
    const liveOps = await getLiveOpsConfig();
    const seed = liveOps?.overriddenSeeds?.[date] ?? generateSeed(date);
    const leaderboard = await getDailyLeaderboardSnapshot(date);
    const summaryKey = `archive:daily:${date}:summary`;
    const leaderboardKey = `archive:daily:${date}:leaderboard`;
    const topEntry = leaderboard[0] ?? null;
    const generatorVersion = generatePuzzlesForSeed(seed, 1)[0]?.meta?.generatorVersion ?? 2;

    await Promise.all([
      redis.hSet(summaryKey, {
        date,
        seed,
        generatorVersion: generatorVersion.toString(),
        winnerUsername: topEntry?.username ?? '',
        winnerScore: (topEntry?.score ?? 0).toString(),
        winnerReplayAvailable: String(topEntry?.hasReplay ?? false),
        totalRuns: (await redis.zCard(getDailyLeaderboardKey(date))).toString(),
      }),
      redis.set(leaderboardKey, JSON.stringify(leaderboard)),
      redis.zAdd(ARCHIVE_INDEX_KEY, { member: date, score: Date.parse(`${date}T00:00:00.000Z`) }),
    ]);

    return c.json({
      status: 'ok',
      archivedDate: date,
      archivedEntries: leaderboard.length,
    });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 401);
  }
});

admin.post('/liveops/disable-date', async (c) => {
  try {
    await requireAdmin();
    const { date } = await c.req.json<{ date: string }>();
    if (!date) throw new Error('Date is required');

    const config = await getWritableLiveOpsConfig();
    if (!config.disabledDates.includes(date)) {
      config.disabledDates.push(date);
    }

    await redis.set('liveops:config', JSON.stringify(config));
    return c.json({ status: 'ok', config });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 401);
  }
});

admin.post('/liveops/override-seed', async (c) => {
  try {
    await requireAdmin();
    const { date, seed } = await c.req.json<{ date: string; seed: string }>();
    if (!date || !seed) throw new Error('Date and seed are required');

    const config = await getWritableLiveOpsConfig();
    config.overriddenSeeds[date] = seed;

    await redis.set('liveops:config', JSON.stringify(config));
    return c.json({ status: 'ok', config });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 401);
  }
});

async function mutateCommunityLayout(
  layoutId: string,
  mutate: (layout: CommunityLayout) => Promise<CommunityLayout> | CommunityLayout
) {
  try {
    await requireAdmin();
    const layout = await getCommunityLayoutById(layoutId);
    if (!layout) {
      return new Response(JSON.stringify({ status: 'error', message: 'Layout not found.' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const nextLayout = await mutate(layout);
    await writeCommunityLayout(nextLayout);
    return new Response(JSON.stringify({ status: 'ok', layout: nextLayout }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ status: 'error', message: (error as Error).message }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

async function requireAdmin() {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    throw new Error('Unauthorized');
  }

  const raw = await redis.get(ADMIN_USERNAMES_KEY);
  const admins = parseAdminUsernames(raw);
  if (!admins.includes(username.toLowerCase())) {
    throw new Error('Admin access required.');
  }

  return username;
}

function parseAdminUsernames(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.map((value) => value.toLowerCase()) : [];
  } catch {
    return raw
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }
}

async function getLiveOpsConfig(): Promise<LiveOpsConfig | null> {
  const raw = await redis.get('liveops:config');
  if (!raw) return null;
  try {
    return JSON.parse(raw) as LiveOpsConfig;
  } catch {
    return null;
  }
}

async function getWritableLiveOpsConfig(): Promise<LiveOpsConfig> {
  return (
    (await getLiveOpsConfig()) ?? {
      disabledDates: [],
      overriddenSeeds: {},
      featuredLayoutIds: [],
      seasonId: null,
      activeEventId: null,
    }
  );
}

async function getDailyLeaderboardSnapshot(date: string) {
  const ranked = await redis.zRange(getDailyLeaderboardKey(date), 0, DAILY_LEADERBOARD_LIMIT - 1, {
    by: 'rank',
    reverse: true,
  });

  const entries: Array<{
    rank: number;
    username: string;
    score: number;
    puzzlesSolved: number;
    hasReplay: boolean;
    isCurrentUser: boolean;
  }> = [];

  for (let index = 0; index < ranked.length; index++) {
    const username = ranked[index]!.member;
    const fields = await redis.hGetAll(getDailyRunMetaKey(date, username));
    const hasReplay =
      Boolean(await redis.get(getDailyPersonalReplayKey(date, username))) ||
      Boolean(await redis.get(getDailyPublicReplayKey(date, username)));
    entries.push({
      rank: index + 1,
      username,
      score: parseInt(fields.score ?? '0', 10),
      puzzlesSolved: parseInt(fields.puzzlesSolved ?? '0', 10),
      hasReplay,
      isCurrentUser: false,
    });
  }

  return entries;
}

function getUtcDateOffset(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

function getDailyLeaderboardKey(date: string) {
  return `daily:${date}:leaderboard`;
}

function getDailyRunMetaKey(date: string, username: string) {
  return `daily:${date}:runs:${username}`;
}

function getDailyPersonalReplayKey(date: string, username: string) {
  return `daily:${date}:replay:self:${username}`;
}

function getDailyPublicReplayKey(date: string, username: string) {
  return `daily:${date}:replay:public:${username}`;
}
