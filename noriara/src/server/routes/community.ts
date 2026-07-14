import { randomUUID } from 'node:crypto';
import { Hono, type Context } from 'hono';
import { redis, reddit } from '@devvit/web/server';
import type {
  CommunityLayoutDiagnostics,
  CommunityLayout,
  CommunityListResponse,
  CommunityMineResponse,
  CommunitySubmitRequest,
  CommunitySubmitResponse,
  StartRunResponse,
} from '../../shared/api';
import {
  isCommunityLayoutPlayable,
  normalizeCommunitySubmission,
  validateCommunitySubmission,
} from '../../shared/communityLayouts';
import {
  COMMUNITY_LAYOUTS_KEY,
  getCommunityRateLimitKey,
  isCommunityLayoutFeatured,
  isCommunityLayoutPublic,
} from './communityStore';

export const community = new Hono();

const COMMUNITY_RUN_VARIANT = 'community' as const;
const COMMUNITY_SUBMISSIONS_PER_DAY = 3;

community.get('/layouts', async (c) => {
  const layouts = (await readCommunityLayouts()).filter(isCommunityLayoutPublic);
  layouts.sort((a, b) => {
    if (isCommunityLayoutFeatured(a) && !isCommunityLayoutFeatured(b)) return -1;
    if (!isCommunityLayoutFeatured(a) && isCommunityLayoutFeatured(b)) return 1;
    return b.upvotes - a.upvotes;
  });

  return c.json<CommunityListResponse>({
    status: 'ok',
    layouts,
  });
});

community.get('/list', async (c) => {
  return c.redirect('/api/community/layouts');
});

community.get('/layouts/mine', async (c) => {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json<CommunityMineResponse>({
      status: 'ok',
      layouts: [],
    });
  }

  return c.json<CommunityMineResponse>({
    status: 'ok',
    layouts: (await readCommunityLayouts()).filter((layout) => layout.authorUsername === username),
  });
});

community.post('/layouts', handleCommunitySubmit);

community.post('/submit', handleCommunitySubmit);

async function handleCommunitySubmit(c: Context) {
  const username = await reddit.getCurrentUsername();
  if (!username) {
    return c.json({ status: 'error', reason: 'Login required' }, 401);
  }

  const request = normalizeCommunitySubmission(await c.req.json<CommunitySubmitRequest>());
  const rateLimitKey = getCommunityRateLimitKey(new Date().toISOString().slice(0, 10), username);
  const submissionCount = await redis.incrBy(rateLimitKey, 1);
  if (submissionCount === 1) {
    await redis.expire(rateLimitKey, 60 * 60 * 24);
  }
  if (submissionCount > COMMUNITY_SUBMISSIONS_PER_DAY) {
    return c.json({ status: 'error', reason: 'Daily community submission limit reached.' }, 429);
  }

  const validation = validateCommunitySubmission(request);
  if (!validation.accepted) {
    return c.json({ status: 'error', reason: validation.reason }, 400);
  }

  const layoutId = randomUUID();
  const timestamp = new Date().toISOString();
  const layout: CommunityLayout = {
    layoutId,
    authorUsername: username,
    title: request.title,
    note: request.note,
    seed: request.seed,
    mechanics: request.mechanics,
    targets: validation.preview.targets,
    hazards: validation.preview.hazards,
    generatorVersion: validation.preview.generatorVersion,
    upvotes: 0,
    submittedAt: timestamp,
    updatedAt: timestamp,
    status: 'submitted',
    rejectionReason: null,
    validatorDiagnostics: validation.diagnostics,
    featuredAt: null,
    retiredAt: null,
    isFeatured: false,
  };

  await writeCommunityLayout(layout);

  return c.json<CommunitySubmitResponse>({ status: 'ok', layout });
}

community.post('/start', async (c) => {
  const req = await c.req.json<{ layoutId: string }>();
  const layout = req.layoutId ? await readCommunityLayout(req.layoutId) : null;
  if (!layout) {
    return c.json({ status: 'error', reason: 'Layout not found' }, 404);
  }
  if (!isCommunityLayoutPlayable(layout)) {
    return c.json({ status: 'error', reason: 'Layout is not approved for play.' }, 403);
  }
  const runId = randomUUID();

  return c.json<StartRunResponse>({
    status: 'ok',
    mode: 'practice',
    runVariant: COMMUNITY_RUN_VARIANT,
    date: layout.layoutId,
    seed: layout.seed,
    runId,
    officialRunAllowed: false, // Community runs are never official ranked runs
    reason: null,
  });
});

async function readCommunityLayouts(): Promise<CommunityLayout[]> {
  const layouts = await redis.hGetAll(COMMUNITY_LAYOUTS_KEY);
  return Object.values(layouts)
    .map((raw) => parseCommunityLayout(raw))
    .filter((layout): layout is CommunityLayout => layout !== null);
}

async function readCommunityLayout(layoutId: string): Promise<CommunityLayout | null> {
  const raw = await redis.hGet(COMMUNITY_LAYOUTS_KEY, layoutId);
  return parseCommunityLayout(raw ?? null);
}

export async function writeCommunityLayout(layout: CommunityLayout): Promise<void> {
  await redis.hSet(COMMUNITY_LAYOUTS_KEY, {
    [layout.layoutId]: JSON.stringify(layout),
  });
}

export async function getCommunityLayoutById(layoutId: string): Promise<CommunityLayout | null> {
  return readCommunityLayout(layoutId);
}

export async function getAllCommunityLayouts(): Promise<CommunityLayout[]> {
  return readCommunityLayouts();
}

function parseCommunityLayout(raw: string | null): CommunityLayout | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CommunityLayout>;
    return {
      layoutId: parsed.layoutId ?? '',
      authorUsername: parsed.authorUsername ?? '',
      title: parsed.title ?? '',
      note: parsed.note ?? '',
      seed: parsed.seed ?? '',
      mechanics: Array.isArray(parsed.mechanics) ? parsed.mechanics : ['core'],
      targets: Array.isArray(parsed.targets) ? parsed.targets : [],
      hazards: Array.isArray(parsed.hazards) ? parsed.hazards : [],
      generatorVersion: parsed.generatorVersion ?? 2,
      upvotes: parsed.upvotes ?? 0,
      submittedAt: parsed.submittedAt ?? new Date(0).toISOString(),
      updatedAt: parsed.updatedAt ?? parsed.submittedAt ?? new Date(0).toISOString(),
      status: parsed.status ?? 'submitted',
      rejectionReason: parsed.rejectionReason ?? null,
      validatorDiagnostics: normalizeDiagnostics(parsed.validatorDiagnostics),
      featuredAt: parsed.featuredAt ?? null,
      retiredAt: parsed.retiredAt ?? null,
      isFeatured: parsed.status === 'featured' || parsed.isFeatured === true,
    };
  } catch {
    return null;
  }
}

function normalizeDiagnostics(raw: unknown): CommunityLayoutDiagnostics {
  const parsed = (raw ?? {}) as Partial<CommunityLayoutDiagnostics>;
  return {
    issues: Array.isArray(parsed.issues) ? parsed.issues : [],
    previewTargetCount: parsed.previewTargetCount ?? 0,
    previewHazardCount: parsed.previewHazardCount ?? 0,
    previewArchetype: parsed.previewArchetype ?? null,
    generatorVersion: parsed.generatorVersion ?? 2,
  };
}
