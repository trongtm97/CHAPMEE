"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ReelsDesktopMain } from "@/components/reels/ReelsDesktopMain";
import { ReelsActionRail } from "@/components/reels/ReelsActionRail";
import { ReelsBottomOverlay } from "@/components/reels/ReelsBottomOverlay";
import { ReelsCommentSheet } from "@/components/reels/ReelsCommentSheet";
import { ReelsFeedEntryRenderer } from "@/components/reels/ReelsFeedEntryRenderer";
import { MobileReelsLayout } from "@/components/reels/MobileReelsLayout";
import type { ReelsRightPanelTab } from "@/components/reels/ReelsRightPanel";
import { ShareModal } from "@/components/share/ShareModal";
import { Card } from "@/components/ui";
import { analyticsEvents } from "@/lib/analytics/events";
import { trackEvent } from "@/lib/analytics/trackEvent";
import {
  trackFeedDwellTime,
  trackFeedFollow,
  trackFeedImpression,
  trackFeedLike,
  trackFeedSave,
  type ReelsAnalyticsContext
} from "@/lib/analytics/trackReelsEvents";
import type { ReelsItem } from "@/lib/reels/getReelsItems";
import { REELS_SHARE_CTA_LABEL } from "@/lib/routes/reels-paths";
import { fetchPlacementConfig } from "@/lib/ads/fetch-placement-config";
import {
  buildReelsFeedEntries,
  type ReelsFeedEntry
} from "@/lib/reels/reels-feed-entries";
import { injectReelsAdSlots } from "@/lib/reels/inject-reels-ad-slots";
import type { CampaignWithSponsor } from "@/types/campaign";
import type { ProductConfig } from "@/types/product-config";
import type { ShareCardPayload } from "@/types/share";
import { useAbortableAsync } from "@/hooks/useAbortableAsync";
import { isAbortError, useLatestRequestGuard } from "@/hooks/useLatestRequestGuard";

export type ReelsFeedProps = {
  desktopConfig: ProductConfig["reels"];
  initialHasMore: boolean;
  initialItems: ReelsItem[];
  initialNextOffset: number;
  initialNextCursor?: string | null;
  initialFocusReelPublicCode?: string | null;
  nativeCampaign?: CampaignWithSponsor | null;
  nativeCardFrequency?: number;
};

type BusyState = {
  follow: boolean;
  like: boolean;
  save: boolean;
  share: boolean;
};

export function ReelsFeed({
  desktopConfig,
  initialHasMore,
  initialItems,
  initialNextOffset,
  initialNextCursor = null,
  initialFocusReelPublicCode = null,
  nativeCampaign = null,
  nativeCardFrequency = 8
}: ReelsFeedProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reelsAdsEnabled, setReelsAdsEnabled] = useState(false);

  const buildEntries = useCallback(
    (items: ReelsItem[], cycle: number, seed: number) => {
      const base = buildReelsFeedEntries({
        items,
        cycle,
        seed,
        nativeCampaign,
        nativeFrequency: nativeCardFrequency
      });
      return injectReelsAdSlots(base, { enabled: reelsAdsEnabled, everyN: 5 });
    },
    [nativeCampaign, nativeCardFrequency, reelsAdsEnabled]
  );

  const [entries, setEntries] = useState<ReelsFeedEntry[]>(() =>
    buildEntries(initialItems, 0, 0)
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const placement = await fetchPlacementConfig("reels_between_items", "/reels");
      if (!cancelled) {
        const showTestInDev =
          placement?.is_test_mode && process.env.NODE_ENV === "development";
        setReelsAdsEnabled(
          Boolean(placement?.is_enabled && (!placement?.is_test_mode || showTestInDev))
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setEntries(buildEntries(initialItems, 0, 0));
    });
    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [reelsAdsEnabled, buildEntries, initialItems]);
  const [nextOffset, setNextOffset] = useState(initialNextOffset);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cycle, setCycle] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isCommentSheetOpen, setIsCommentSheetOpen] = useState(false);
  const [sharePayload, setSharePayload] = useState<ShareCardPayload | null>(null);
  const [isDesktop, setIsDesktop] = useState(false);
  const [isDesktopRightPanelOpen, setIsDesktopRightPanelOpen] = useState(false);
  const [activeDesktopPanelTab, setActiveDesktopPanelTab] = useState<ReelsRightPanelTab | null>(
    null
  );
  const [isUltraWideDesktop, setIsUltraWideDesktop] = useState(false);
  const [busy, setBusy] = useState<BusyState>({
    follow: false,
    like: false,
    save: false,
    share: false
  });
  const createAbortController = useAbortableAsync();
  const requestGuard = useLatestRequestGuard();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const currentContext = useRef<ReelsAnalyticsContext | null>(null);
  const viewStartTime = useRef<number | null>(null);
  const seenImpressions = useRef(new Set<string>());
  const impressionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const IMPRESSION_DELAY_MS = 750;

  const currentEntry = entries[currentIndex];
  const currentItem = currentEntry?.kind === "reel" ? currentEntry.item : null;
  const activeContext = useMemo(
    () =>
      currentEntry?.kind === "reel"
        ? { item: currentEntry.item, itemIndex: currentIndex }
        : null,
    [currentEntry, currentIndex]
  );

  useEffect(() => {
    if (!initialFocusReelPublicCode) {
      return;
    }

    const targetIndex = entries.findIndex(
      (entry) =>
        entry.kind === "reel" &&
        entry.item.reelPublicCode === initialFocusReelPublicCode
    );

    if (targetIndex < 0) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      setCurrentIndex(targetIndex);
      itemRefs.current[targetIndex]?.scrollIntoView({
        behavior: "auto",
        block: "start"
      });
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [entries, initialFocusReelPublicCode]);

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
    (
      matcher: (item: ReelsItem) => boolean,
      patch: (item: ReelsItem) => ReelsItem
    ) => {
      setEntries((previous) =>
        previous.map((entry) => {
          if (entry.kind !== "reel" || !matcher(entry.item)) {
            return entry;
          }
          return { ...entry, item: patch(entry.item) };
        })
      );
    },
    []
  );

  const loadMore = useCallback(async () => {
    if (isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    const requestId = requestGuard.nextRequestId();
    const controller = createAbortController();

    try {
      const params = new URLSearchParams({ limit: "12" });
      if (nextCursor) {
        params.set("cursor", nextCursor);
      } else {
        params.set("offset", `${hasMore ? nextOffset : 0}`);
      }
      const response = await fetch(`/api/reels/items?${params.toString()}`, {
        cache: "no-store",
        signal: controller.signal
      });
      const payload = (await response.json()) as {
        hasMore: boolean;
        items: ReelsItem[];
        nextOffset: number;
        nextCursor?: string | null;
      };

      if (!requestGuard.onlyLatest(requestId)) {
        return;
      }

      const nextCycle = hasMore ? cycle : cycle + 1;
      const appended = buildEntries(
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
      setNextCursor(payload.nextCursor ?? null);
    } catch (error) {
      if (!isAbortError(error) && requestGuard.onlyLatest(requestId)) {
        console.warn("[reels] load more failed", error);
      }
    } finally {
      if (requestGuard.onlyLatest(requestId)) {
        setIsLoadingMore(false);
      }
    }
  }, [
    buildEntries,
    createAbortController,
    cycle,
    entries,
    hasMore,
    isLoadingMore,
    nextCursor,
    nextOffset,
    requestGuard
  ]);

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

  const openDesktopPanel = useCallback((tab: ReelsRightPanelTab) => {
    setActiveDesktopPanelTab(tab);
    setIsDesktopRightPanelOpen(true);
  }, []);

  const closeDesktopPanel = useCallback(() => {
    setIsDesktopRightPanelOpen(false);
    setActiveDesktopPanelTab(null);
  }, []);

  useEffect(() => {
    if (!currentEntry || currentEntry.kind !== "reel") {
      return;
    }

    const previousKey = currentContext.current?.item.id ?? null;
    const nextContext = { item: currentEntry.item, itemIndex: currentIndex };

    if (previousKey && previousKey !== currentEntry.item.id) {
      closeCurrentView();
    }

    currentContext.current = nextContext;
    viewStartTime.current = performance.now();

    if (impressionTimerRef.current) {
      clearTimeout(impressionTimerRef.current);
    }

    impressionTimerRef.current = setTimeout(() => {
      if (seenImpressions.current.has(currentEntry.instanceId)) {
        return;
      }

      trackFeedImpression(nextContext);
      void trackEvent({
        eventName: analyticsEvents.reelsItemViewed,
        metadata: {
          author_id: currentEntry.item.creatorId,
          item_index: currentIndex,
          story_id: currentEntry.item.storyId,
          candidate_pool: currentEntry.item.feed?.candidatePool ?? null,
          request_id: currentEntry.item.feed?.requestId ?? null
        },
        targetId: currentEntry.item.id,
        targetType: "episode"
      });
      seenImpressions.current.add(currentEntry.instanceId);
    }, IMPRESSION_DELAY_MS);

    return () => {
      if (impressionTimerRef.current) {
        clearTimeout(impressionTimerRef.current);
        impressionTimerRef.current = null;
      }
    };
  }, [currentEntry, currentIndex]);

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

      const response = await fetch("/api/reels/engagement", {
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
    trackFeedLike({ item: currentItem, itemIndex: currentIndex }, nextLiked);
    void trackEvent({
      eventName: analyticsEvents.reelsLikeClicked,
      metadata: { item_index: currentIndex, source: "reels", story_id: currentItem.storyId },
      targetId: currentItem.storyId,
      targetType: "story"
    });
    setBusy((previous) => ({ ...previous, like: true }));
    patchEntries(
      (item) => item.id === currentItem.id,
      (item) => ({
        ...item,
        isLiked: nextLiked,
        likeCount: Math.max(0, item.likeCount + (nextLiked ? 1 : -1))
      })
    );

    const ok = await postEngagement("like");

    if (!ok) {
      patchEntries(
        (item) => item.id === currentItem.id,
        (item) => ({
          ...item,
          isLiked: !nextLiked,
          likeCount: Math.max(0, item.likeCount + (nextLiked ? -1 : 1))
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
    trackFeedSave({ item: currentItem, itemIndex: currentIndex }, nextSaved);
    void trackEvent({
      eventName: analyticsEvents.reelsSaveClicked,
      metadata: { item_index: currentIndex, source: "reels", story_id: currentItem.storyId },
      targetId: currentItem.storyId,
      targetType: "story"
    });
    setBusy((previous) => ({ ...previous, save: true }));
    patchEntries(
      (item) => item.storyId === currentItem.storyId,
      (item) => ({
        ...item,
        isSaved: nextSaved,
        saveCount: Math.max(0, item.saveCount + (nextSaved ? 1 : -1))
      })
    );

    const ok = await postEngagement("save");

    if (!ok) {
      patchEntries(
        (item) => item.storyId === currentItem.storyId,
        (item) => ({
          ...item,
          isSaved: !nextSaved,
          saveCount: Math.max(0, item.saveCount + (nextSaved ? -1 : 1))
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
    trackFeedFollow({ item: currentItem, itemIndex: currentIndex }, nextFollowing);
    void trackEvent({
      eventName: analyticsEvents.reelsFollowAuthorClicked,
      metadata: { item_index: currentIndex, source: "reels", creator_id: currentItem.creatorId },
      targetId: currentItem.creatorId,
      targetType: "creator"
    });
    setBusy((previous) => ({ ...previous, follow: true }));
    patchEntries(
      (item) => item.creatorId === currentItem.creatorId,
      (item) => ({
        ...item,
        isFollowingCreator: nextFollowing
      })
    );

    const ok = await postEngagement("follow");

    if (!ok) {
      patchEntries(
        (item) => item.creatorId === currentItem.creatorId,
        (item) => ({
          ...item,
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
      eventName: analyticsEvents.reelsShareClicked,
      metadata: { item_index: currentIndex, source: "reels", story_id: currentItem.storyId },
      targetId: currentItem.storyId,
      targetType: "story"
    });

    setSharePayload({
      authorName: currentItem.creatorName,
      backgroundUrl:
        currentItem.backgroundImageUrl ?? currentItem.creatorAvatarUrl ?? null,
      ctaLabel: REELS_SHARE_CTA_LABEL,
      excerpt: currentItem.excerpt,
      genreName: currentItem.genreName,
      hook: currentItem.hookTitle,
      kind: "reel",
      slug: `${currentItem.storySlug}-${currentItem.episodeNumber}`,
      targetId: currentItem.id,
      targetType: "episode",
      text: currentItem.excerpt,
      title: `${currentItem.episodeTitle} - ${currentItem.storyTitle}`,
      url: `${window.location.origin}${currentItem.reelHref ?? currentItem.readMoreHref}`
    });
  }, [currentIndex, currentItem]);

  const handleCommentCreated = useCallback(() => {
    if (!currentItem) {
      return;
    }

    patchEntries(
      (item) => item.id === currentItem.id,
      (item) => ({
        ...item,
        commentCount: item.commentCount + 1
      })
    );
  }, [currentItem, patchEntries]);

  // Read more is handled in the action rail and item card navigation.
  if (entries.length === 0) {
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
              Chưa có Reels phù hợp
            </h2>
            <p className="mt-1 text-sm leading-6 text-zinc-400">
              Hãy quay lại sau hoặc khám phá danh mục truyện.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <>
      {isDesktop ? (
        <ReelsDesktopMain
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
        <MobileReelsLayout>
          <div
            ref={containerRef}
            className={`h-full min-h-0 overflow-y-auto overscroll-contain scroll-smooth snap-y snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
              isCommentSheetOpen ? "pointer-events-none" : ""
            }`}
          >
            {entries.map((entry, index) => (
              <section
                className="relative h-full min-h-full snap-start snap-always overflow-hidden"
                data-index={index}
                key={entry.instanceId}
                ref={(node) => {
                  itemRefs.current[index] = node;
                }}
              >
                <ReelsFeedEntryRenderer entry={entry} />
              </section>
            ))}
          </div>
          {activeContext ? (
            <>
              <ReelsActionRail
                context={activeContext}
                isBusy={busy}
                onOpenComments={() => setIsCommentSheetOpen(true)}
                onShare={() => void handleShare()}
                onToggleFollow={() => void handleToggleFollow()}
                onToggleLike={() => void handleToggleLike()}
                onToggleSave={() => void handleToggleSave()}
              />
              <ReelsBottomOverlay context={activeContext} />
            </>
          ) : null}
        </MobileReelsLayout>
      )}

      {isLoadingMore ? (
        <div className="pointer-events-none absolute left-4 top-4 z-20 rounded-full bg-black/35 px-3 py-1.5 text-[0.72rem] font-medium text-zinc-300">
          Đang tải thêm...
        </div>
      ) : null}

      <ReelsCommentSheet
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
