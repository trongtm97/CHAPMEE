export type ShareCardKind = "story" | "swipe" | "generic" | "profile" | "achievement";

export type ShareCardStat = {
  label: string;
  value: string;
};

export type ShareCardPayload = {
  kind: ShareCardKind;
  title: string;
  text: string;
  url?: string | null;
  storyId?: string | null;
  creatorId?: string | null;
  targetId?: string | null;
  targetType?: "story" | "episode" | "creator" | "profile" | "badge" | "milestone" | "feed";
  slug?: string;
  authorName?: string | null;
  genreName?: string | null;
  hook?: string | null;
  excerpt?: string | null;
  coverUrl?: string | null;
  backgroundUrl?: string | null;
  ctaLabel?: string;
  stats?: ShareCardStat[];
  avatarUrl?: string | null;
  bio?: string | null;
};
