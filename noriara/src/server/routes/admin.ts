import { Hono } from 'hono';
import type { AdminCommunityListResponse, CommunityLayout } from '../../shared/api';
import { isValidIsoDate, normalizeEventConfig, type EventConfigInput } from '../../shared/liveOps';
import { getAllCommunityLayouts, getCommunityLayoutById, writeCommunityLayout } from './community';
import { archiveDailyLeaderboard, getUtcDateOffset } from '../services/dailyArchive';
import {
  activateEvent,
  deactivateEvent,
  getWritableLiveOpsConfig,
  saveAndActivateEvent,
  saveLiveOpsConfig,
} from '../services/liveOps';
import { requireConfigModerator } from '../services/moderatorAuth';

export const admin = new Hono();

admin.get('/community/layouts', async (c) => {
  try {
    await requireConfigModerator();
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
    await requireConfigModerator();
    const result = await archiveDailyLeaderboard(getUtcDateOffset(-1));

    return c.json({
      status: 'ok',
      ...result,
    });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 401);
  }
});

admin.post('/liveops/disable-date', async (c) => {
  try {
    await requireConfigModerator();
    const { date } = await c.req.json<{ date: string }>();
    if (!isValidIsoDate(date)) throw new Error('Date must use YYYY-MM-DD.');

    const config = await getWritableLiveOpsConfig();
    if (!config.disabledDates.includes(date)) {
      config.disabledDates.push(date);
    }

    await saveLiveOpsConfig(config);
    return c.json({ status: 'ok', config });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 401);
  }
});

admin.post('/liveops/override-seed', async (c) => {
  try {
    await requireConfigModerator();
    const { date, seed } = await c.req.json<{ date: string; seed: string }>();
    if (!isValidIsoDate(date) || !seed?.trim()) throw new Error('A valid date and seed are required.');

    const config = await getWritableLiveOpsConfig();
    config.overriddenSeeds[date] = seed.trim();

    await saveLiveOpsConfig(config);
    return c.json({ status: 'ok', config });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 401);
  }
});

admin.post('/events', async (c) => {
  try {
    await requireConfigModerator();
    const body = await c.req.json<EventConfigInput & { activate?: unknown }>();
    const eventConfig = normalizeEventConfig(body);
    await saveAndActivateEvent(eventConfig, body.activate === true);
    return c.json({ status: 'ok', eventConfig, active: body.activate === true });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 400);
  }
});

admin.post('/events/:id/activate', async (c) => {
  try {
    await requireConfigModerator();
    const eventConfig = await activateEvent(c.req.param('id'));
    return c.json({ status: 'ok', eventConfig, active: true });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 400);
  }
});

admin.post('/events/deactivate', async (c) => {
  try {
    await requireConfigModerator();
    await deactivateEvent();
    return c.json({ status: 'ok', active: false });
  } catch (error) {
    return c.json({ status: 'error', message: (error as Error).message }, 400);
  }
});

async function mutateCommunityLayout(
  layoutId: string,
  mutate: (layout: CommunityLayout) => Promise<CommunityLayout> | CommunityLayout
) {
  try {
    await requireConfigModerator();
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
