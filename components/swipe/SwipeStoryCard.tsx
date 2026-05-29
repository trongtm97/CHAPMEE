import type { MutableRefObject, RefObject } from "react";
import type { SwipeItem } from "@/lib/swipe/getSwipeItems";
import { SwipeFeedItem } from "@/components/swipe/SwipeFeedItem";

type SwipeStoryCardProps = {
  entries: Array<SwipeItem & { instanceId: string }>;
  itemRefs: MutableRefObject<(HTMLElement | null)[]>;
  containerRef: RefObject<HTMLDivElement | null>;
};

export function SwipeStoryCard({ entries, itemRefs, containerRef }: SwipeStoryCardProps) {
  return (
    <div className="w-[min(100vw-8rem,520px)] overflow-hidden rounded-3xl border border-white/10 bg-black/35 shadow-[0_24px_56px_rgba(0,0,0,0.4)] xl:w-[580px] 2xl:w-[620px]">
      <div
        ref={containerRef}
        className="h-[min(820px,calc(100dvh-8.5rem))] min-h-[620px] overflow-y-auto overscroll-contain scroll-smooth snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {entries.map((item, index) => (
          <section
            className="relative h-[min(820px,calc(100dvh-8.5rem))] min-h-[620px] snap-start snap-always overflow-hidden"
            data-index={index}
            key={item.instanceId}
            ref={(node) => {
              itemRefs.current[index] = node;
            }}
          >
            <SwipeFeedItem item={item} />
          </section>
        ))}
      </div>
    </div>
  );
}
