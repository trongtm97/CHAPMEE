"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { SwipeDesktopMain } from "@/components/swipe/SwipeDesktopMain";
import { SwipeActionRail } from "@/components/swipe/SwipeActionRail";
import { SwipeBottomOverlay } from "@/components/swipe/SwipeBottomOverlay";
import { SwipeCommentSheet } from "@/components/swipe/SwipeCommentSheet";
import { SwipeFeedItem } from "@/components/swipe/SwipeFeedItem";
import { MobileSwipeLayout } from "@/components/swipe/MobileSwipeLayout";
import type { SwipeRightPanelTab } from "@/components/swipe/SwipeRightPanel";
import { ShareModal } from "@/components/share/ShareModal";
import { Card } from "@/components/ui";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";
import {
  trackFeedDwellTime,
  trackFeedImpression,
  type SwipeAnalyticsContext
} from "@/lib/analytics/trackSwipeEvents";
import type { SwipeItem } from "@/lib/swipe/getSwipeItems";
import type { ProductConfig } from "@/types/product-config";
import type { ShareCardPayload } from "@/types/share";

export type SwipeFeedProps = {
  desktopConfig: ProductConfig["swipe"];
  initialHasMore: boolean;
  initialItems: SwipeItem[];
  initialNextOffset: number;
};

type FeedEntry = SwipeItem & {
  instanceId: string;
};

type BusyState = {
  follow: boolean;
  like: boolean;
  save: boolean;
  share: boolean;
};

function createEntries(items: SwipeItem[], cycle: number, seed: number) {
  return items.map((item, index) => ({
    ...item,
    instanceId: `${item.id}-${cycle}-${seed + index}`
  }));
}

export function SwipeFeed({
  desktopConfig,
  initialHasMore,
  initialItems,
  initialNextOffset
}: SwipeFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [entries, setEntries] = useState<FeedEntry[]>(() =>
    createEntries(initialItems, 0, 0)
  );
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cycle, setCycle] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState<ShareCardPayload | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDesktopRightPanelOpen, setIsDesktopRightPanelOpen] = useState(false);
  const [activeDesktopPanelTab, setActiveDesktopPanelTab] = useState<SwipeRightPanelTab | null>(
    null
  );
  const [isUltraWideDesktop, setIsUltraWideDesktop] = useState(false);
  const [busy, setBusy] = useState<BusyState>({
    follow: false,
    like: false,
    save: false,
    share: false
  });
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const currentContext = useRef<SwipeAnalyticsContext | null>(null);
  const viewStartTime = useRef<number | null>(null);
  const seenImpressions = useRef(new Set<string>());

  const currentItem = entries[currentIndex];
  const activeContext = useMemo(
    () => (currentItem ? { item: currentItem, itemIndex: currentIndex } : null),
    [currentIndex, currentItem]
  );

  function closeCurrentView() {
    if (!currentContext.current || viewStartTime.current === null) {
      return;
    }

    trackFeedDwellTime(
      currentContext.current,
      performance.now() - viewStartTime.current
    );
    viewStartTime.current = null;
  }

  const openIndex = useCallback(
    (nextIndex: number, behavior: ScrollBehavior = "smooth") => {
      const nextItem = entries[nextIndex];

      if (!nextItem) {
        return;
      }

      const target = itemRefs.current[nextIndex];
      if (target) {
        target.scrollIntoView({ behavior, block: "start" });
      } else {
        setCurrentIndex(nextIndex);
      }
    },
    [entries]
  );

  const patchEntries = useCallback(
    (matcher: (entry: FeedEntry) => boolean, patch: (entry: FeedEntry) => FeedEntry) => {
      setEntries((previous) =>
        previous.map((entry) => (matcher(entry) ? patch(entry) : entry))
      );
    },
    []
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);

    try {
      const params = new URLSearchParams({
        limit: "12",
        offset: `${hasMore ? nextOffset : 0}`
      });
      const response = await fetch(`/api/swipe/items?${params.toString()}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as {
        hasMore: boolean;
        items: SwipeItem[];
        nextOffset: number;
      };

      const nextCycle = hasMore ? cycle : cycle + 1;
      const appended = createEntries(
        payload.items,
        nextCycle,
        entries.length + nextCycle * 1000
      );

      if (appended.length > 0) {
        setEntries((previous) => previous.concat(appended));
      }

      setCycle(nextCycle);
      setHasMore(payload.hasMore);
      setNextOffset(payload.nextOffset);
    } finally {
      setIsLoadingMore(false);
    }
  }, [cycle, entries.length, hasMore, isLoadingMore, nextOffset]);

  useEffect(() => {
    function syncViewport() {
      setIsDesktop(window.innerWidth >= 1024);
      setIsUltraWideDesktop(window.innerWidth >= 1536);
    }

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
    };
  }, []);

  const openDesktopPanel = useCallback((tab: SwipeRightPanelTab) => {
    setActiveDesktopPanelTab(tab);
    setIsDesktopRightPanelOpen(true);
  }, []);

  const closeDesktopPanel = useCallback(() => {
    setIsDesktopRightPanelOpen(false);
    setActiveDesktopPanelTab(null);
  }, []);

  useEffect(() => {
    if (!currentItem) {
      return;
    }

    const previousKey =
      (currentContext.current?.item as FeedEntry | undefined)?.instanceId ?? null;
    const nextContext = { item: currentItem, itemIndex: currentIndex };

    if (previousKey && previousKey !== currentItem.instanceId) {
      closeCurrentView();
    }

    currentContext.current = nextContext;
    viewStartTime.current = performance.now();

    if (!seenImpressions.current.has(currentItem.instanceId)) {
      trackFeedImpression(nextContext);
      void trackEvent({
        eventName: analyticsEvents.swipeItemViewed,
        metadata: {
          author_id: currentItem.creatorId,
          item_index: currentIndex,
          story_id: currentItem.storyId
        },
        targetId: currentItem.id,
        targetType: "episode"
      });
      seenImpressions.current.add(currentItem.instanceId);
    }
  }, [currentIndex, currentItem]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const observer = new IntersectionObserver(
      (observerEntries) => {
        const activeEntry = observerEntries
          .filter((entry) => entry.isIntersecting)
          .sort((first, second) => second.intersectionRatio - first.intersectionRatio)[0];

        if (!activeEntry) {
          return;
        }

        const nextIndex = Number(
          (activeEntry.target as HTMLElement).dataset.index ?? ""
        );

        if (Number.isNaN(nextIndex)) {
          return;
        }

        setCurrentIndex((previousIndex) =>
          previousIndex === nextIndex ? previousIndex : nextIndex
        );
      },
      {
        root: container,
        threshold: [0.65, 0.8, 0.95]
      }
    );

    itemRefs.current.forEach((itemRef) => {
      if (itemRef) {
        observer.observe(itemRef);
      }
    });

    return () => {
      observer.disconnect();
    };
  }, [entries.length]);

  useEffect(() => {
    if (currentIndex >= entries.length - 3) {
      const frame = window.requestAnimationFrame(() => {
        void loadMore();
      });

      return () => {
        window.cancelAnimationFrame(frame);
      };
    }
  }, [currentIndex, entries.length, loadMore]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;

      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable)
      ) {
        return;
      }

      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowRight" ||
        event.key === "PageDown"
      ) {
        event.preventDefault();
        openIndex(Math.min(currentIndex + 1, entries.length - 1));
      }

      if (
        event.key === "ArrowUp" ||
        event.key === "ArrowLeft" ||
        event.key === "PageUp"
      ) {
        event.preventDefault();
        openIndex(Math.max(currentIndex - 1, 0));
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [currentIndex, entries.length, openIndex]);

  useEffect(() => {
    return () => closeCurrentView();
  }, []);

  const postEngagement = useCallback(
    async (action: "follow" | "like" | "save" | "share") => {
      if (!activeContext) {
        return false;
      }

      const response = await fetch("/api/swipe/engagement", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          action,
          creatorId: activeContext.item.creatorId,
          episodeId: activeContext.item.id,
          itemIndex: activeContext.itemIndex,
          storyId: activeContext.item.storyId
        })
      });

      const payload = (await response.json()) as
        | { error?: string; loginUrl?: string; ok?: boolean }
        | undefined;

      if (response.status === 401 && payload?.loginUrl) {
        window.location.href = payload.loginUrl;
        return false;
      }

      return response.ok;
    },
    [activeContext]
  );

  const handleToggleLike = useCallback(async () => {
    if (!currentItem || busy.like) {
      return;
    }

    const nextLiked = !currentItem.isLiked;
    void trackEvent({
      eventName: analyticsEvents.swipeLikeClicked,
      metadata: { item_index: currentIndex, source: "swipe", story_id: currentItem.storyId },
      targetId: currentItem.storyId,
      targetType: "story"
    });
    setBusy((previous) => ({ ...previous, like: true }));
    patchEntries(
      (entry) => entry.id === currentItem.id,
      (entry) => ({
        ...entry,
        isLiked: nextLiked,
        likeCount: Math.max(0, entry.likeCount + (nextLiked ? 1 : -1))
      })
    );

    const ok = await postEngagement("like");

    if (!ok) {
      patchEntries(
        (entry) => entry.id === currentItem.id,
        (entry) => ({
          ...entry,
          isLiked: !nextLiked,
          likeCount: Math.max(0, entry.likeCount + (nextLiked ? -1 : 1))
        })
      );
    }

    setBusy((previous) => ({ ...previous, like: false }));
  }, [busy.like, currentIndex, currentItem, patchEntries, postEngagement]);

  const handleToggleSave = useCallback(async () => {
    if (!currentItem || busy.save) {
      return;
    }

    const nextSaved = !currentItem.isSaved;
    void trackEvent({
      eventName: analyticsEvents.swipeSaveClicked,
      metadata: { item_index: currentIndex, source: "swipe", story_id: currentItem.storyId },
      targetId: currentItem.storyId,
      targetType: "story"
    });
    setBusy((previous) => ({ ...previous, save: true }));
    patchEntries(
      (entry) => entry.storyId === currentItem.storyId,
      (entry) => ({
        ...entry,
        isSaved: nextSaved,
        saveCount: Math.max(0, entry.saveCount + (nextSaved ? 1 : -1))
      })
    );

    const ok = await postEngagement("save");

    if (!ok) {
      patchEntries(
        (entry) => entry.storyId === currentItem.storyId,
        (entry) => ({
          ...entry,
          isSaved: !nextSaved,
          saveCount: Math.max(0, entry.saveCount + (nextSaved ? -1 : 1))
        })
      );
    }

    setBusy((previous) => ({ ...previous, save: false }));
  }, [busy.save, currentIndex, currentItem, patchEntries, postEngagement]);

  const handleToggleFollow = useCallback(async () => {
    if (!currentItem?.creatorId || busy.follow) {
      return;
    }

    const nextFollowing = !currentItem.isFollowingCreator;
    void trackEvent({
      eventName: analyticsEvents.swipeFollowAuthorClicked,
      metadata: { item_index: currentIndex, source: "swipe", creator_id: currentItem.creatorId },
      targetId: currentItem.creatorId,
      targetType: "creator"
    });
    setBusy((previous) => ({ ...previous, follow: true }));
    patchEntries(
      (entry) => entry.creatorId === currentItem.creatorId,
      (entry) => ({
        ...entry,
        isFollowingCreator: nextFollowing
      })
    );

    const ok = await postEngagement("follow");

    if (!ok) {
      patchEntries(
        (entry) => entry.creatorId === currentItem.creatorId,
        (entry) => ({
          ...entry,
          isFollowingCreator: !nextFollowing
        })
      );
    }

    setBusy((previous) => ({ ...previous, follow: false }));
  }, [busy.follow, currentIndex, currentItem, patchEntries, postEngagement]);

  const handleShare = useCallback(() => {
    if (!currentItem) {
      return;
    }

    void trackEvent({
      eventName: analyticsEvents.swipeShareClicked,
      metadata: { item_index: currentIndex, source: "swipe", story_id: currentItem.storyId },
      targetId: currentItem.storyId,
      targetType: "story"
    });

    setSharePayload({
      authorName: currentItem.creatorName,
      backgroundUrl:
        currentItem.backgroundImageUrl ?? currentItem.creatorAvatarUrl ?? null,
      ctaLabel: "Lướt truyện này trên ChapMee",
      excerpt: currentItem.excerpt,
      genreName: currentItem.genreName,
      hook: currentItem.hookTitle,
      kind: "swipe",
      slug: `${currentItem.storySlug}-${currentItem.episodeNumber}`,
      targetId: currentItem.id,
      targetType: "episode",
      text: currentItem.excerpt,
      title: `${currentItem.episodeTitle} - ${currentItem.storyTitle}`,
      url: `${window.location.origin}/stories/${currentItem.storySlug}/episodes/${currentItem.episodeNumber}`
    });
  }, [currentIndex, currentItem]);

  const handleCommentCreated = useCallback(() => {
    if (!currentItem) {
      return;
    }

    patchEntries(
      (entry) => entry.id === currentItem.id,
      (entry) => ({
        ...entry,
        commentCount: entry.commentCount + 1
      })
    );
  }, [currentItem, patchEntries]);

  // Read more is handled in the action rail and item card navigation.
  if (!currentItem) {
    return (
      <Card className="m-4 border-white/8 bg-white/[0.035] p-4 sm:m-5">
        <div className="flex items-start gap-3">
          <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-cyan-300/15 bg-cyan-300/10 text-cyan-200">
            <span
              aria-hidden="true"
              className="block h-2.5 w-2.5 rounded-full bg-current"
            />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-white">
              Chưa có nội dung để lướt
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Khi có chap công khai, feed lướt sẽ hiện ngay ở đây.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {isDesktop ? (
        <SwipeDesktopMain
          activeTab={isDesktopRightPanelOpen ? activeDesktopPanelTab : null}
          containerRef={containerRef}
          context={activeContext}
          entries={entries}
          isBusy={busy}
          isWideRightPanelEnabled={desktopConfig.desktopShowRightPanel && isUltraWideDesktop}
          itemRefs={itemRefs}
          onClosePanel={closeDesktopPanel}
          onOpenComments={() => setIsCommentSheetOpen(true)}
          onOpenPanel={openDesktopPanel}
          onShare={() => void handleShare()}
          onToggleFollow={() => void handleToggleFollow()}
          onToggleLike={() => void handleToggleLike()}
          onToggleSave={() => void handleToggleSave()}
        />
      ) : (
        <MobileSwipeLayout>
          <div
            ref={containerRef}
            className={`h-full min-h-0 overflow-y-auto overscroll-contain scroll-smooth snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              isCommentSheetOpen ? "pointer-events-none" : ""
            }`}
          >
            {entries.map((item, index) => (
              <section
                className="relative h-full min-h-full snap-start snap-always overflow-hidden"
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
          {activeContext ? (
            <>
              <SwipeActionRail
                context={activeContext}
                isBusy={busy}
                onOpenComments={() => setIsCommentSheetOpen(true)}
                onShare={() => void handleShare()}
                onToggleFollow={() => void handleToggleFollow()}
                onToggleLike={() => void handleToggleLike()}
                onToggleSave={() => void handleToggleSave()}
              />
              <SwipeBottomOverlay context={activeContext} />
            </>
          ) : null}
        </MobileSwipeLayout>
      )}

      {isLoadingMore ? (
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-black/35 px-3 py-1.5 text-[0.72rem] font-medium text-zinc-300">
          Đang tải thêm...
        </div>
      ) : null}

      <SwipeCommentSheet
        context={activeContext}
        onClose={() => setIsCommentSheetOpen(false)}
        onCommentCreated={handleCommentCreated}
        open={isCommentSheetOpen}
      />
      {sharePayload ? (
        <ShareModal
          onClose={() => setSharePayload(null)}
          onCompleted={async () => {
            try {
              await postEngagement("share");
            } catch {
              // Share analytics should never block the share flow.
            }
          }}
          open={Boolean(sharePayload)}
          payload={sharePayload}
        />
      ) : null}
    </>
  );
}
