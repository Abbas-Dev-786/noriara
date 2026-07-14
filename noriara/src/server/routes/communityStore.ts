import type { CommunityLayout } from '../../shared/api';

export const COMMUNITY_LAYOUTS_KEY = 'community:layouts';

export function getCommunityRateLimitKey(date: string, username: string) {
  return `community:layoutSubmit:${date}:${username}`;
}

export function isCommunityLayoutPublic(layout: CommunityLayout): boolean {
  return layout.status === 'approved' || layout.status === 'featured';
}

export function isCommunityLayoutFeatured(layout: CommunityLayout): boolean {
  return layout.status === 'featured' || layout.isFeatured;
}
