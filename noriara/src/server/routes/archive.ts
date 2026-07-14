import { Hono } from 'hono';
import { redis } from '@devvit/web/server';
import type { ArchiveListResponse, ArchiveDateResponse, ArchivedDailySummary } from '../../shared/api';

export const archive = new Hono();

const INDEX_KEY = 'archive:daily:index';

archive.get('/', async (c) => {
  const dates = await redis.zRange(INDEX_KEY, 0, -1, { by: 'score', reverse: true });
  return c.json<ArchiveListResponse>({
    status: 'ok',
    dates: dates.map(m => m.member),
  });
});

archive.get('/:date', async (c) => {
  const date = c.req.param('date');
  const summaryKey = `archive:daily:${date}:summary`;
  const leaderboardKey = `archive:daily:${date}:leaderboard`;
  const rawSummary = await redis.hGetAll(summaryKey);
  const rawLeaderboard = await redis.get(leaderboardKey);

  let summary: ArchivedDailySummary | null = null;
  if (rawSummary.date) {
    summary = {
      date: rawSummary.date,
      seed: rawSummary.seed ?? '',
      generatorVersion: parseInt(rawSummary.generatorVersion ?? '1', 10),
      winnerUsername: rawSummary.winnerUsername || null,
      winnerScore: parseInt(rawSummary.winnerScore ?? '0', 10),
      winnerReplayAvailable: rawSummary.winnerReplayAvailable === 'true',
      totalRuns: parseInt(rawSummary.totalRuns ?? '0', 10),
    };
  }

  let leaderboard: ArchiveDateResponse['leaderboard'] = [];
  if (rawLeaderboard) {
    try {
      const parsed = JSON.parse(rawLeaderboard) as ArchiveDateResponse['leaderboard'];
      leaderboard = Array.isArray(parsed) ? parsed : [];
    } catch {
      leaderboard = [];
    }
  }

  return c.json<ArchiveDateResponse>({
    status: 'ok',
    date,
    summary,
    leaderboard,
  });
});
