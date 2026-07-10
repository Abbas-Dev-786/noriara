import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  if (!context.subredditName) {
    throw new Error('subredditName is required to create a custom post');
  }

  return await reddit.submitCustomPost({
    subredditName: context.subredditName,
    title: 'Noriara',
    entry: 'default',
  });
};
