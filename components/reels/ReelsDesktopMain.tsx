import type { MutableRefObject, RefObject } from "react";
import type { ReelsAnalyticsContext } from "@/lib/analytics/trackReelsEvents";
import { ReelsActionRail } from "@/components/reels/ReelsActionRail";
import { ReelsRightPanel, type ReelsRightPanelTab } from "@/components/reels/ReelsRightPanel";
import { ReelsStoryCard } from "@/components/reels/ReelsStoryCard";
import type { ReelsFeedEntry } from "@/lib/reels/reels-feed-entries";

type ReelsDesktopMainProps = {
  activeTab: ReelsRightPanelTab | null;
  context: ReelsAnalyticsContext | null;
  entries: ReelsFeedEntry[];
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
  onCommentCreated: () => void;
  onOpenPanel: (tab: ReelsRightPanelTab) => void;
  onShare: () => void;
  onToggleFollow: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
};

export function ReelsDesktopMain({
  activeTab,
  context,
  entries,
  isBusy,
  isWideRightPanelEnabled,
  itemRefs,
  containerRef,
  onClosePanel,
  onCommentCreated,
  onOpenPanel,
  onShare,
  onToggleFollow,
  onToggleLike,
  onToggleSave
}: ReelsDesktopMainProps) {
  const showRightPanel = Boolean(activeTab);
  return (
    <div className="flex h-full min-h-0 w-full justify-center overflow-hidden px-4 py-5 md:px-6 xl:px-8">
      <div className="flex h-full min-h-0 w-full max-w-[1280px] items-center justify-center gap-4 xl:gap-6">
        <section
          aria-label="Reels stage"
          className="flex min-w-0 flex-1 items-center justify-center"
        >
          <div className="flex items-center gap-4 xl:gap-6">
            <ReelsStoryCard containerRef={containerRef} entries={entries} itemRefs={itemRefs} />
            {context ? (
              <ReelsActionRail
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
          <ReelsRightPanel
            activeTab={activeTab}
            context={context}
            isFollowBusy={isBusy.follow}
            onClose={onClosePanel}
            onCommentCreated={onCommentCreated}
            onToggleFollow={onToggleFollow}
          />
        ) : null}
      </div>
    </div>
  );
}
