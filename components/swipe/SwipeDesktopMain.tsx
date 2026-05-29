import type { MutableRefObject, RefObject } from "react";
import type { SwipeAnalyticsContext } from "@/lib/analytics/trackSwipeEvents";
import { SwipeActionRail } from "@/components/swipe/SwipeActionRail";
import { SwipeRightPanel, type SwipeRightPanelTab } from "@/components/swipe/SwipeRightPanel";
import { SwipeStoryCard } from "@/components/swipe/SwipeStoryCard";
import type { SwipeItem } from "@/lib/swipe/getSwipeItems";

type SwipeDesktopMainProps = {
  activeTab: SwipeRightPanelTab | null;
  context: SwipeAnalyticsContext | null;
  entries: Array<SwipeItem & { instanceId: string }>;
  isBusy: {
    follow: boolean;
    like: boolean;
    save: boolean;
    share: boolean;
  };
  isWideRightPanelEnabled: boolean;
  itemRefs: MutableRefObject<(HTMLElement | null)[]>;
  containerRef: RefObject<HTMLDivElement | null>;
  onClosePanel: () => void;
  onOpenComments: () => void;
  onOpenPanel: (tab: SwipeRightPanelTab) => void;
  onShare: () => void;
  onToggleFollow: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
};

export function SwipeDesktopMain({
  activeTab,
  context,
  entries,
  isBusy,
  isWideRightPanelEnabled,
  itemRefs,
  containerRef,
  onClosePanel,
  onOpenComments,
  onOpenPanel,
  onShare,
  onToggleFollow,
  onToggleLike,
  onToggleSave
}: SwipeDesktopMainProps) {
  const showRightPanel = Boolean(activeTab);
  return (
    <div className="flex h-full min-h-0 w-full justify-center overflow-hidden px-4 py-5 md:px-6 xl:px-8">
      <div className="flex h-full min-h-0 w-full max-w-[1280px] items-center justify-center gap-4 xl:gap-6">
        <section
          aria-label="Swipe stage"
          className="flex min-w-0 flex-1 items-center justify-center"
        >
          <div className="flex items-center gap-4 xl:gap-6">
            <SwipeStoryCard containerRef={containerRef} entries={entries} itemRefs={itemRefs} />
            {context ? (
              <SwipeActionRail
                context={context}
                isBusy={isBusy}
                onOpenComments={() => onOpenPanel("comments")}
                onShare={onShare}
                onToggleFollow={onToggleFollow}
                onToggleLike={onToggleLike}
                onToggleSave={onToggleSave}
                variant="desktop"
              />
            ) : null}
          </div>
        </section>

        {showRightPanel || isWideRightPanelEnabled ? (
          <SwipeRightPanel
            activeTab={activeTab}
            context={context}
            isFollowBusy={isBusy.follow}
            onClose={onClosePanel}
            onOpenComments={onOpenComments}
            onToggleFollow={onToggleFollow}
          />
        ) : null}
      </div>
    </div>
  );
}
