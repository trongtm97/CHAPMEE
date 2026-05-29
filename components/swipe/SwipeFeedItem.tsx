import { SwipeTextScene } from "@/components/swipe/SwipeTextScene";
import type { SwipeItem } from "@/lib/swipe/getSwipeItems";

type SwipeFeedItemProps = {
  item: SwipeItem;
};

export function SwipeFeedItem({ item }: SwipeFeedItemProps) {
  return <SwipeTextScene item={item} />;
}
