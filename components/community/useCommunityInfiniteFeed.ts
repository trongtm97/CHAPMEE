"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CommunityFeedItem,
  CommunityFeedPageResponse,
  CommunityFeedTab
} from "@/types/community";

type FeedCacheEntry = {
  items: CommunityFeedItem[];
  nextCursor: string | null;
  hasMore: boolean;
  fetchedAt: number;
};

const FEED_CACHE_TTL_MS = 90_000;
const feedCache = new Map<string, FeedCacheEntry>();

function feedCacheKey(tab: CommunityFeedTab, searchQuery: string) {
  return `${tab}:${searchQuery.trim()}`;
}

type UseCommunityInfiniteFeedParams = {
  tab: CommunityFeedTab;
  searchQuery?: string;
  limit?: number;
  refreshToken?: number;
};

function dedupeItems(items: CommunityFeedItem[]) {
  const seen = new Set<string>();

  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }

    seen.add(item.id);
    return true;
  });
}

export function useCommunityInfiniteFeed({
  limit = 10,
  refreshToken = 0,
  searchQuery = "",
  tab
}: UseCommunityInfiniteFeedParams) {
  const [items, setItems] = useState<CommunityFeedItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isFetchingNextPage, setIsFetchingNextPage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchIdRef = useRef(0);
  const inFlightCursorRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const autoFillPassesRef = useRef(0);

  const fetchPage = useCallback(
    async (cursor: string | null, mode: "reset" | "append") => {
      const fetchId = fetchIdRef.current + 1;
      fetchIdRef.current = fetchId;

      if (mode === "append") {
        if (!cursor || inFlightCursorRef.current === cursor) {
          return;
        }

        inFlightCursorRef.current = cursor;
        setIsFetchingNextPage(true);
      } else {
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        const cacheKey = feedCacheKey(tab, searchQuery);
        const cached = feedCache.get(cacheKey);
        const hasStaleCache =
          cached !== undefined && Date.now() - cached.fetchedAt < FEED_CACHE_TTL_MS;

        if (hasStaleCache) {
          setItems(cached.items);
          setNextCursor(cached.nextCursor);
          setHasMore(cached.hasMore);
          setIsInitialLoading(false);
          setIsRefreshing(true);
        } else {
          setItems([]);
          setIsInitialLoading(true);
          setIsRefreshing(false);
          setHasMore(true);
          setNextCursor(null);
        }

        setError(null);
        inFlightCursorRef.current = null;
      }

      const controller = mode === "reset" ? abortRef.current! : new AbortController();

      try {
        const params = new URLSearchParams({
          tab,
          limit: String(limit)
        });

        if (cursor) {
          params.set("cursor", cursor);
        }

        const trimmedQuery = searchQuery.trim();

        if (trimmedQuery) {
          params.set("q", trimmedQuery);
        }

        const response = await fetch(`/api/community/feed?${params.toString()}`, {
          signal: controller.signal,
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("Không tải được bài viết.");
        }

        const data = (await response.json()) as CommunityFeedPageResponse;

        if (fetchId !== fetchIdRef.current) {
          return;
        }

        if (data.error) {
          throw new Error(data.error);
        }

        setItems((current) => {
          const nextItems = dedupeItems(
            mode === "reset" ? data.items : [...current, ...data.items]
          );

          if (mode === "reset") {
            feedCache.set(feedCacheKey(tab, searchQuery), {
              items: nextItems,
              nextCursor: data.nextCursor,
              hasMore: data.hasMore,
              fetchedAt: Date.now()
            });
          }

          return nextItems;
        });
        setNextCursor(data.nextCursor);
        setHasMore(data.hasMore);
        setError(null);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          return;
        }

        if (fetchId !== fetchIdRef.current) {
          return;
        }

        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Không tải được bài viết."
        );
      } finally {
        if (fetchId === fetchIdRef.current) {
          setIsInitialLoading(false);
          setIsRefreshing(false);
          setIsFetchingNextPage(false);
          inFlightCursorRef.current = null;
        }
      }
    },
    [limit, searchQuery, tab]
  );

  useEffect(() => {
    autoFillPassesRef.current = 0;
    feedCache.delete(feedCacheKey(tab, searchQuery));
    void fetchPage(null, "reset");

    return () => {
      fetchIdRef.current += 1;
      abortRef.current?.abort();
    };
  }, [fetchPage, refreshToken, searchQuery, tab]);

  const loadMore = useCallback(() => {
    if (isInitialLoading || isFetchingNextPage || !hasMore || !nextCursor) {
      return;
    }

    void fetchPage(nextCursor, "append");
  }, [fetchPage, hasMore, isFetchingNextPage, isInitialLoading, nextCursor]);

  /** Fill short viewports — capped to avoid request storms on /community. */
  useEffect(() => {
    if (isInitialLoading || isFetchingNextPage || !hasMore || !nextCursor) {
      return;
    }

    if (autoFillPassesRef.current >= 3) {
      return;
    }

    const doc = document.documentElement;

    if (doc.scrollHeight <= doc.clientHeight + 120) {
      autoFillPassesRef.current += 1;
      void fetchPage(nextCursor, "append");
    }
  }, [
    fetchPage,
    hasMore,
    isFetchingNextPage,
    isInitialLoading,
    items.length,
    nextCursor
  ]);

  const retry = useCallback(() => {
    if (items.length === 0) {
      void fetchPage(null, "reset");
      return;
    }

    void fetchPage(nextCursor, "append");
  }, [fetchPage, items.length, nextCursor]);

  const hideItem = useCallback((itemId: string) => {
    setItems((current) => current.filter((item) => item.id !== itemId));
  }, []);

  return {
    items,
    hasMore,
    isInitialLoading,
    isRefreshing,
    isFetchingNextPage,
    error,
    loadMore,
    retry,
    hideItem
  };
}
