import type { RankingBoardItem, RankingBoardType, RankingTimeWindow } from "@/types/ranking-board";
import { getPrimaryMetricLabel, RANKING_PERIOD_OPTIONS } from "@/lib/ranking/ranking-ui-utils";
import { getProfileUrl } from "@/lib/profile/profile-url";
import { resolvePublicShareUrl } from "@/lib/site/site-url";

export type RankingShareContext = {
  item: RankingBoardItem;
  boardLabel: string;
  boardType: RankingBoardType;
  timeWindow: RankingTimeWindow;
  periodLabel?: string;
  rankingPagePath?: string;
};

export type RankingShareBadgeData = {
  rank: number;
  boardLabel: string;
  periodLabel: string;
  title: string;
  authorUsername: string | null;
  authorDisplayName: string | null;
  metric: string | null;
  score: number;
  coverUrl: string | null;
  shareUrl: string;
  ctaLabel: string;
  itemType: RankingBoardItem["itemType"];
  medalTier: "gold" | "silver" | "bronze" | "standard";
};

export function getRankingPeriodLabel(
  timeWindow: RankingTimeWindow,
  fallback?: string
): string {
  return (
    RANKING_PERIOD_OPTIONS.find((option) => option.value === timeWindow)?.label ??
    fallback ??
    "Tuần này"
  );
}

export function getRankingMedalTier(rank: number): RankingShareBadgeData["medalTier"] {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "standard";
}

export function resolveRankingItemSharePath(item: RankingBoardItem): string {
  if (item.itemType === "author" && item.authorUsername) {
    return getProfileUrl(item.authorUsername) ?? item.href;
  }
  return item.href;
}

export function buildRankingShareUrl(context: RankingShareContext): string {
  return resolvePublicShareUrl(resolveRankingItemSharePath(context.item));
}

export function isRankingShareOwner(
  item: RankingBoardItem,
  currentUserId: string | null | undefined
): boolean {
  if (!currentUserId || !item.ownerUserId) {
    return false;
  }
  return item.ownerUserId === currentUserId;
}

export function buildRankingShareText(
  context: RankingShareContext,
  shareUrl: string,
  isOwner: boolean
): string {
  const { item, boardLabel } = context;
  const rankingName = boardLabel;

  if (item.itemType === "author") {
    if (isOwner) {
      return `Tôi đang đứng #${item.rank} trên ${rankingName} của ChapMee. Xem tại ${shareUrl}`;
    }
    return `${item.title} đang đứng #${item.rank} trên ${rankingName} của ChapMee. Xem tại ${shareUrl}`;
  }

  if (isOwner) {
    return `Tác phẩm của tôi đang đứng #${item.rank} trên ${rankingName} của ChapMee: ${item.title}. Đọc tại ${shareUrl}`;
  }

  return `${item.title} đang đứng #${item.rank} trên ${rankingName} của ChapMee. Xem tại ${shareUrl}`;
}

export function getRankingShareCtaLabel(itemType: RankingBoardItem["itemType"]): string {
  if (itemType === "author") return "Xem trên ChapMee";
  if (itemType === "reel") return "Xem trên ChapMee";
  return "Đọc trên ChapMee";
}

export function buildRankingShareBadgeData(
  context: RankingShareContext,
  shareUrl: string
): RankingShareBadgeData {
  const { item, boardLabel, boardType, timeWindow, periodLabel } = context;

  return {
    rank: item.rank,
    boardLabel,
    periodLabel: periodLabel ?? getRankingPeriodLabel(timeWindow, boardLabel),
    title: item.title,
    authorUsername: item.authorUsername,
    authorDisplayName: item.authorDisplayName,
    metric: getPrimaryMetricLabel(item, boardType),
    score: item.score,
    coverUrl: item.coverUrl,
    shareUrl,
    ctaLabel: getRankingShareCtaLabel(item.itemType),
    itemType: item.itemType,
    medalTier: getRankingMedalTier(item.rank)
  };
}

export function getRankingBadgeFilename(data: RankingShareBadgeData): string {
  const safe = data.title
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u1EF9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `chapmee-ranking-${data.rank}-${safe || "badge"}.png`;
}
