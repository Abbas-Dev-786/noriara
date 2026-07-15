import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { normalizeEventConfig } from '../../shared/liveOps';
import { saveAndActivateEvent } from '../services/liveOps';
import { requireConfigModerator } from '../services/moderatorAuth';

export const forms = new Hono();

forms.post('/event-submit', async (c) => {
  try {
    await requireConfigModerator();
    const body = await c.req.json<{
      eventId: unknown;
      label: unknown;
      startDate: unknown;
      endDate: unknown;
      seed: unknown;
      timerSeconds: unknown;
      puzzleCount: unknown;
      activate: unknown;
    }>();
    const config = normalizeEventConfig(body);
    const activate = body.activate === true;
    await saveAndActivateEvent(config, activate);

    return c.json<UiResponse>({
      showToast: activate
        ? `Event "${config.label}" saved and activated.`
        : `Event "${config.label}" saved.`,
    });
  } catch (error) {
    return c.json<UiResponse>({ showToast: (error as Error).message }, 400);
  }
});
