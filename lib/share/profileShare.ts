import type { CreatorProfile } from "@/lib/creator/getCreatorProfile";
import type { EarlyFanStoryItem } from "@/types/early-fan";
import type { TopFanHighlight } from "@/types/fan";
import type { ProfileAchievement, ProfileBadge, ProfileStat } from "@/types/profile";
import type { ShareCardPayload } from "@/types/share";

export function buildReaderProfileSharePayload(input: {
  title: string;
  avatarUrl?: string | null;
  bio?: string | null;
  stats?: ProfileStat[];
  badges?: ProfileBadge[];
  achievements?: ProfileAchievement[];
  topFanHighlights?: TopFanHighlight[];
  earlyFanStories?: EarlyFanStoryItem[];
  url: string;
}): ShareCardPayload {
  const highlighted =
    input.badges?.[0]?.label ??
    input.achievements?.find((item) => item.status === "unlocked")?.title ??
    input.topFanHighlights?.[0]?.title ??
    input.earlyFanStories?.[0]?.title ??
    null;

  return {
    kind: "profile",
    title: input.title,
    text: highlighted
      ? `Danh hiệu nổi bật: ${highlighted}`
      : "Gu đọc của tôi trên ChapMee",
    url: input.url,
    avatarUrl: input.avatarUrl ?? null,
    bio: input.bio ?? null,
    ctaLabel: "Xem gu đọc của tôi trên ChapMee",
    stats: input.stats?.slice(0, 4) ?? []
  };
}

export function buildAuthorProfileSharePayload(input: {
  creatorProfile: CreatorProfile;
  stats: {
    followers: number;
    reads: number;
    totalStories: number;
  };
  featuredStory?: { title: string; slug: string; coverUrl?: string | null } | null;
  url: string;
}): ShareCardPayload {
  return {
    kind: "profile",
    title: input.creatorProfile.pen_name,
    text: input.creatorProfile.bio ?? "Theo dõi tác giả trên ChapMee",
    url: input.url,
    creatorId: input.creatorProfile.id,
    avatarUrl: null,
    bio: input.creatorProfile.bio,
    ctaLabel: "Theo dõi tác giả trên ChapMee",
    stats: [
      { label: "Follower", value: `${input.stats.followers}` },
      { label: "Lượt đọc", value: `${input.stats.reads}` },
      { label: "Truyện", value: `${input.stats.totalStories}` },
      ...(input.featuredStory ? [{ label: "Nổi bật", value: input.featuredStory.title }] : [])
    ]
  };
}

export function buildAchievementSharePayload(input: {
  title: string;
  text: string;
  url: string;
  avatarUrl?: string | null;
  ctaLabel?: string;
  stats?: { label: string; value: string }[];
}): ShareCardPayload {
  return {
    kind: "achievement",
    title: input.title,
    text: input.text,
    url: input.url,
    avatarUrl: input.avatarUrl ?? null,
    ctaLabel: input.ctaLabel ?? "Xem chi tiết trên ChapMee",
    stats: input.stats ?? []
  };
}
