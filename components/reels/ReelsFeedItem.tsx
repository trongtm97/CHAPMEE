import { ReelsFeedDebugBadge } from "@/components/reels/ReelsFeedDebugBadge";
import { ReelsTextScene } from "@/components/reels/ReelsTextScene";
import type { ReelsItem } from "@/lib/reels/getReelsItems";

type ReelsFeedItemProps = {
  item: ReelsItem;
};

export function ReelsFeedItem({ item }: ReelsFeedItemProps) {
  return (
    <>
      <ReelsFeedDebugBadge item={item} />
      <ReelsTextScene item={item} />
    </>
  );
}
