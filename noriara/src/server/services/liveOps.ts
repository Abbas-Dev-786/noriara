import { redis } from '@devvit/web/server';
import type { EventConfig, LiveOpsConfig } from '../../shared/api';

const LIVE_OPS_KEY = 'liveops:config';

export async function getLiveOpsConfig(): Promise<LiveOpsConfig | null> {
  const raw = await redis.get(LIVE_OPS_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as LiveOpsConfig;
  } catch {
    return null;
  }
}

export async function getWritableLiveOpsConfig(): Promise<LiveOpsConfig> {
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

export async function saveLiveOpsConfig(config: LiveOpsConfig): Promise<void> {
  await redis.set(LIVE_OPS_KEY, JSON.stringify(config));
}

export async function saveAndActivateEvent(config: EventConfig, activate: boolean): Promise<void> {
  const liveOps = await getWritableLiveOpsConfig();
  if (activate) liveOps.activeEventId = config.eventId;

  await Promise.all([
    redis.set(getEventConfigKey(config.eventId), JSON.stringify(config)),
    saveLiveOpsConfig(liveOps),
  ]);
}

export async function activateEvent(eventId: string): Promise<EventConfig> {
  const config = await getEventConfig(eventId);
  if (!config) throw new Error('Event configuration not found.');

  const liveOps = await getWritableLiveOpsConfig();
  liveOps.activeEventId = eventId;
  await saveLiveOpsConfig(liveOps);
  return config;
}

export async function deactivateEvent(): Promise<void> {
  const liveOps = await getWritableLiveOpsConfig();
  liveOps.activeEventId = null;
  await saveLiveOpsConfig(liveOps);
}

export async function getEventConfig(eventId: string): Promise<EventConfig | null> {
  const raw = await redis.get(getEventConfigKey(eventId));
  if (!raw) return null;

  try {
    return JSON.parse(raw) as EventConfig;
  } catch {
    return null;
  }
}

export async function getConfiguredActiveEvent(): Promise<EventConfig | null> {
  const liveOps = await getLiveOpsConfig();
  return liveOps?.activeEventId ? getEventConfig(liveOps.activeEventId) : null;
}

function getEventConfigKey(eventId: string) {
  return `event:${eventId}:config`;
}
