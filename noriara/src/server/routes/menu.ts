import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
import { context } from '@devvit/web/server';
import { createPost } from '../core/post';
import { deactivateEvent, getConfiguredActiveEvent } from '../services/liveOps';
import { requireConfigModerator } from '../services/moderatorAuth';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const post = await createPost();

    return c.json<UiResponse>(
      {
        navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
      },
      200
    );
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json<UiResponse>(
      {
        showToast: 'Failed to create post',
      },
      400
    );
  }
});

menu.post('/event-configure', async (c) => {
  try {
    await requireConfigModerator();
    const current = await getConfiguredActiveEvent();
    const today = new Date().toISOString().slice(0, 10);

    return c.json<UiResponse>({
      showForm: {
        name: 'eventForm',
        form: {
          title: 'Configure Noriara event',
          description: 'Save an event configuration and optionally make it active immediately.',
          acceptLabel: 'Save event',
          cancelLabel: 'Cancel',
          fields: [
            {
              type: 'string',
              name: 'eventId',
              label: 'Event ID',
              helpText: '3-40 lowercase letters, numbers, or hyphens.',
              required: true,
              defaultValue: current?.eventId ?? '',
            },
            {
              type: 'string',
              name: 'label',
              label: 'Display label',
              required: true,
              defaultValue: current?.label ?? '',
            },
            {
              type: 'string',
              name: 'startDate',
              label: 'Start date (YYYY-MM-DD)',
              required: true,
              defaultValue: current?.startDate ?? today,
            },
            {
              type: 'string',
              name: 'endDate',
              label: 'End date (YYYY-MM-DD)',
              required: true,
              defaultValue: current?.endDate ?? today,
            },
            {
              type: 'string',
              name: 'seed',
              label: 'Puzzle seed',
              required: true,
              defaultValue: current?.seed ?? '',
            },
            {
              type: 'number',
              name: 'timerSeconds',
              label: 'Timer in seconds',
              required: true,
              defaultValue: current ? current.timerMs / 1000 : 45,
            },
            {
              type: 'number',
              name: 'puzzleCount',
              label: 'Puzzle count',
              required: true,
              defaultValue: current?.puzzleCount ?? 40,
            },
            {
              type: 'boolean',
              name: 'activate',
              label: 'Activate this event',
              defaultValue: true,
            },
          ],
        },
      },
    });
  } catch (error) {
    return c.json<UiResponse>({ showToast: (error as Error).message }, 401);
  }
});

menu.post('/event-deactivate', async (c) => {
  try {
    await requireConfigModerator();
    await deactivateEvent();
    return c.json<UiResponse>({ showToast: 'The active Noriara event was deactivated.' });
  } catch (error) {
    return c.json<UiResponse>({ showToast: (error as Error).message }, 401);
  }
});
