"use client";

import Link from "next/link";
import { memo, useCallback, useEffect, useRef } from "react";
import { CommunityFeedCard } from "@/components/community/CommunityFeedCard";
import { CommunityFeedEnd } from "@/components/community/CommunityFeedEnd";
import { CommunityFeedError } from "@/components/community/CommunityFeedError";
import { CommunityFeedSkeleton } from "@/components/community/CommunityFeedSkeleton";
import { useCommunityInfiniteFeed } from "@/components/community/useCommunityInfiniteFeed";
import { EmptyState } from "@/components/ui";
import type { CommunityFeedTab } from "@/types/community";

type CommunityInfiniteFeedProps = {
  activeTab: CommunityFeedTab;
  searchQuery?: string;
  onWriteClick?: () => void;
};

const MemoFeedCard = memo(CommunityFeedCard);

export function CommunityInfiniteFeed({
  activeTab,
  onWriteClick,
  searchQuery = ""
}: CommunityInfiniteFeedProps) {
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const {
    error,
    hasMore,
    hideItem,
    isFetchingNextPage,
    isInitialLoading,
    isRefreshing,
    items,
    loadMore,
    retry
  } = useCommunityInfiniteFeed({ tab: activeTab, searchQuery, limit: 10 });

  const tryLoadMore = useCallback(() => {
    loadMore();
  }, [loadMore]);

  useEffect(() => {
    const node = sentinelRef.current;

    if (!node) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          tryLoadMore();
        }
      },
      { root: null, rootMargin: "400px 0px 400px 0px", threshold: 0 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, [tryLoadMore]);

  useEffect(() => {
    function onScroll() {
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - doc.scrollTop - doc.clientHeight;

      if (remaining < 320) {
        tryLoadMore();
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, [tryLoadMore]);

  return (
    <section className="space-y-2" id="community-feed">
      <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
        Bảng tin
      </h2>

      {isInitialLoading && items.length === 0 ? (
        <CommunityFeedSkeleton count={5} />
      ) : items.length ? (
        <div
          className={`space-y-2 transition-opacity duration-200 ${isRefreshing ? "opacity-70" : "opacity-100"}`}
        >
          {items.map((item) => (
            <MemoFeedCard item={item} key={item.id} onHide={hideItem} />
          ))}
        </div>
      ) : error ? (
        <CommunityFeedError message={error} onRetry={retry} />
      ) : (
        <EmptyState
          action={
            <Link
              className="tap-highlight inline-flex min-h-10 items-center justify-center rounded-full bg-cyan-300 px-4 text-xs font-black uppercase text-zinc-950"
              href="/community/groups"
            >
              Khám phá nhóm truyện
            </Link>
          }
          description="Thử đổi tab hoặc tìm từ khóa khác."
          title="Chưa có bài phù hợp."
        />
      )}

      {isFetchingNextPage ? (
        <div className="space-y-2 py-2">
          <p className="text-center text-xs text-zinc-500">Đang tải thêm...</p>
          <CommunityFeedSkeleton count={2} />
        </div>
      ) : null}

      {error && items.length > 0 ? (
        <CommunityFeedError message={error} onRetry={retry} />
      ) : null}

      {hasMore && !isFetchingNextPage && !isInitialLoading ? (
        <button
          className="tap-highlight w-full rounded-xl border border-dashed border-white/15 py-3 text-center text-xs font-semibold text-zinc-400 hover:border-cyan-300/30 hover:text-cyan-200"
          onClick={tryLoadMore}
          type="button"
        >
          Tải thêm bài
        </button>
      ) : null}

      {!isInitialLoading && !hasMore && items.length > 0 ? (
        <CommunityFeedEnd onWriteClick={onWriteClick} />
      ) : null}

      <div
        aria-hidden="true"
        className="min-h-[1px]"
        ref={sentinelRef}
      />
    </section>
  );
}
