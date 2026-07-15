import { context, reddit } from '@devvit/web/server';

export async function requireConfigModerator(): Promise<string> {
  const user = await reddit.getCurrentUser();
  const subredditName = context.subredditName;
  if (!user || !subredditName) throw new Error('Unauthorized.');

  const permissions = await user.getModPermissionsForSubreddit(subredditName);
  if (!permissions.includes('all') && !permissions.includes('config')) {
    throw new Error('Moderator config permission is required.');
  }

  return user.username;
}
