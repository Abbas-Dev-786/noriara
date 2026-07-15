import { Hono } from 'hono';
import { archiveDailyLeaderboard, getUtcDateOffset } from '../services/dailyArchive';

export const scheduler = new Hono();

scheduler.post('/archive-yesterday', async (c) => {
  try {
    const result = await archiveDailyLeaderboard(getUtcDateOffset(-1));
    return c.json({ status: 'ok', ...result });
  } catch (error) {
    console.error('Scheduled daily archive failed:', error);
    return c.json({ status: 'error', message: 'Scheduled daily archive failed.' }, 500);
  }
});
