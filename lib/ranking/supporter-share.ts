import { resolvePublicShareUrl } from "@/lib/site/site-url";
import type { SupporterRankingItem } from "@/types/tip";

export function buildSupporterShareUrl(): string {
  return resolvePublicShareUrl("/bang-xep-hang");
}

export function buildSupporterShareText(
  item: SupporterRankingItem,
  rank: number,
  shareUrl: string,
  isSelf: boolean
): string {
  if (item.is_anonymous) {
    return `Bảng Top fan ủng hộ ChapMee — xem ai đang dẫn đầu tại ${shareUrl}`;
  }

  if (isSelf) {
    return `Tôi đang Top #${rank} fan ủng hộ trên ChapMee với ${item.total_coin.toLocaleString("vi-VN")} coin! ${shareUrl}`;
  }

  return `${item.display_name} đang Top #${rank} fan ủng hộ trên ChapMee với ${item.total_coin.toLocaleString("vi-VN")} coin! ${shareUrl}`;
}
