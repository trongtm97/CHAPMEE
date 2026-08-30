"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { StoryGroupActivityCard } from "@/components/community/story-group/StoryGroupActivityCard";
import { StoryGroupActivityFilters } from "@/components/community/story-group/StoryGroupActivityFilters";
import { StoryGroupActivitySkeleton } from "@/components/community/story-group/StoryGroupActivitySkeleton";
import type { GroupFeedFilterId } from "@/lib/community-sync/constants";
import type { EnrichedGroupFeedItemView } from "@/lib/community-sync/enrich-group-feed-items";
import type { StoryGroupActivityFilterPresence } from "@/components/community/story-group/StoryGroupActivityFilters";
import { EmptyState, ErrorState } from "@/components/ui";

type StoryGroupActivityFeedProps = {
  storyId: string;
  initialItems: EnrichedGroupFeedItemView[];
  initialNextCursor: string | null;
  initialHasMore: boolean;
  readerChapterNumber: number | null;
  filterPresence: StoryGroupActivityFilterPresence;
  initialFilter?: GroupFeedFilterId;
  emptyTitle?: string;
  emptyDescription?: string;
};

type FeedResponse = {
  items: EnrichedGroupFeedItemView[];
  nextCursor: string | null;
  hasMore: boolean;
  error?: string | null;
};

function filterToTabParam(filter: GroupFeedFilterId): string | null {
  if (filter === "all") {
    return null;
  }
  return filter;
}

export function StoryGroupActivityFeed({
  emptyDescription = "Hãy là người đầu tiên bình luận hoặc thảo luận về truyện này.",
  emptyTitle = "Chưa có hoạt động",
  filterPresence,
  initialFilter = "all",
  initialHasMore,
  initialItems,
  initialNextCursor,
  readerChapterNumber,
  storyId
}: StoryGroupActivityFeedProps) {
  const [activeFilter, setActiveFilter] = useState<GroupFeedFilterId>(initialFilter);
  const [items, setItems] = useState(initialItems);
  const [nextCursor, setNextCursor] = useState(initialNextCursor);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const skipInitialFetchRef = useRef(activeFilter === "all");

  const fetchPage = useCallback(
    async (cursor: string | null, filter: GroupFeedFilterId) => {
      const params = new URLSearchParams({ limit: "10" });
      if (cursor) {
        params.set("cursor", cursor);
      }
      const tab = filterToTabParam(filter);
      if (tab) {
        params.set("tab", tab);
      }

      const response = await fetch(
        `/api/community/story/${encodeURIComponent(storyId)}/feed?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Không tải hoạt động được.");
      }

      return (await response.json()) as FeedResponse;
    },
    [storyId]
  );

  useEffect(() => {
    if (skipInitialFetchRef.current) {
      skipInitialFetchRef.current = false;
      return;
    }

    setLoading(true);
    setError(null);

    void fetchPage(null, activeFilter)
      .then((data) => {
        setItems(data.items);
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
      })
      .catch((loadError) => {
        setError(
          loadError instanceof Error ? loadError.message : "Không tải hoạt động được."
        );
      })
      .finally(() => setLoading(false));
  }, [activeFilter, fetchPage]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loading || !nextCursor) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchPage(nextCursor, activeFilter);
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        const merged = [...current];
        for (const item of data.items) {
          if (!seen.has(item.id)) {
            merged.push(item);
          }
        }
        return merged;
      });
      setNextCursor(data.nextCursor);
      setHasMore(data.hasMore);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Không tải thêm hoạt động được."
      );
    } finally {
      setLoading(false);
    }
  }, [activeFilter, fetchPage, hasMore, loading, nextCursor]);

  return (
    <div className="space-y-3">
      <StoryGroupActivityFilters
        activeFilter={activeFilter}
        onChange={setActiveFilter}
        presence={filterPresence}
      />

      {!items.length && loading ? <StoryGroupActivitySkeleton count={3} /> : null}

      {!items.length && !loading ? (
        <EmptyState description={emptyDescription} title={emptyTitle} />
      ) : null}

      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <StoryGroupActivityCard
              item={item}
              key={item.id}
              readerChapterNumber={readerChapterNumber}
            />
          ))}
        </div>
      ) : null}

      {error ? <ErrorState message={error} title="Không tải thêm được" /> : null}

      {loading && items.length ? <StoryGroupActivitySkeleton count={2} /> : null}

      {hasMore ? (
        <div className="flex justify-center pt-1">
          <button
            className="inline-flex min-h-10 items-center rounded-full border border-white/15 px-5 text-sm font-bold text-zinc-200 transition hover:border-cyan-300/35 hover:text-cyan-100 disabled:opacity-50"
            disabled={loading}
            onClick={() => void loadMore()}
            type="button"
          >
            {loading ? "Đang tải…" : "Xem thêm"}
          </button>
        </div>
      ) : items.length > 0 ? (
        <p className="pt-1 text-center text-xs text-zinc-500">Đã hiển thị tất cả hoạt động.</p>
      ) : null}
    </div>
  );
}
