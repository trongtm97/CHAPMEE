export type EarlyFanStoryItem = {
  id: string;
  storyId: string;
  slug: string;
  title: string;
  coverUrl: string | null;
  hook: string | null;
  awardedAt: string;
  readsAtAward: number;
  followersAtAward: number;
};

export type EarlyFanAwardNotice = {
  storyId: string;
  storySlug: string;
  storyTitle: string;
  awardedAt: string;
  readsAtAward: number;
  followersAtAward: number;
};
