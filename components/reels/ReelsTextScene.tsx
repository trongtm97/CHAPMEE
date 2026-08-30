import { ReelCtaCard } from "@/components/reels/ReelCtaCard";
import { ReelTextOverlay } from "@/components/reels/ReelTextOverlay";
import { ReelsBackground } from "@/components/reels/ReelsBackground";
import type { ReelsAnalyticsContext } from "@/lib/analytics/trackReelsEvents";
import type { ReelsItem } from "@/lib/reels/getReelsItems";

type ReelsTextSceneProps = {
  item: ReelsItem;
  analyticsContext?: ReelsAnalyticsContext;
};

export function ReelsTextScene({ item, analyticsContext }: ReelsTextSceneProps) {
  const context: ReelsAnalyticsContext | null =
    analyticsContext ?? { item, itemIndex: 0 };

  return (
    <article className="relative flex h-full w-full flex-col overflow-hidden">
      <ReelsBackground genreName={item.genreName} imageUrl={item.backgroundImageUrl} />

      <ReelTextOverlay item={item} variant="mobile" />

      {context ? (
        <aside className="pointer-events-none absolute inset-x-0 bottom-0 z-10 hidden px-6 pb-6 lg:block">
          <div className="pointer-events-auto max-w-md">
            <ReelCtaCard context={context} ctaLabel={item.ctaLabel || "Đọc tiếp"} />
          </div>
        </aside>
      ) : null}
    </article>
  );
}
