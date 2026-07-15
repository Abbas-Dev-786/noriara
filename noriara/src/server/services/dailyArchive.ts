import { redis } from '@devvit/web/server';
import type { LeaderboardEntry } from '../../shared/api';
import { generatePuzzlesForSeed } from '../../shared/puzzle';
import { generateSeed } from '../../shared/seed';
import { getLiveOpsConfig } from './liveOps';

const ARCHIVE_INDEX_KEY = 'archive:daily:index';
const DAILY_LEADERBOARD_LIMIT = 100;

export async function archiveDailyLeaderboard(date: string) {
  const liveOps = await getLiveOpsConfig();
  const seed = liveOps?.overriddenSeeds?.[date] ?? generateSeed(date);
  const leaderboard = await getDailyLeaderboardSnapshot(date);
  const summaryKey = `archive:daily:${date}:summary`;
  const leaderboardKey = `archive:daily:${date}:leaderboard`;
  const topEntry = leaderboard[0] ?? null;
  const generatorVersion = generatePuzzlesForSeed(seed, 1)[0]?.meta?.generatorVersion ?? 2;
  const totalRuns = await redis.zCard(getDailyLeaderboardKey(date));

  await Promise.all([
    redis.hSet(summaryKey, {
      date,
      seed,
      generatorVersion: generatorVersion.toString(),
      winnerUsername: topEntry?.username ?? '',
      winnerScore: (topEntry?.score ?? 0).toString(),
      winnerReplayAvailable: String(topEntry?.hasReplay ?? false),
      totalRuns: totalRuns.toString(),
    }),
    redis.set(leaderboardKey, JSON.stringify(leaderboard)),
    redis.zAdd(ARCHIVE_INDEX_KEY, { member: date, score: Date.parse(`${date}T00:00:00.000Z`) }),
  ]);

  return {
    archivedDate: date,
    archivedEntries: leaderboard.length,
  };
}

export function getUtcDateOffset(offsetDays: number) {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}

async function getDailyLeaderboardSnapshot(date: string): Promise<LeaderboardEntry[]> {
  const ranked = await redis.zRange(getDailyLeaderboardKey(date), 0, DAILY_LEADERBOARD_LIMIT - 1, {
    by: 'rank',
    reverse: true,
  });

  const entries: LeaderboardEntry[] = [];
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
