"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CommunityFeedCard } from "@/components/community/CommunityFeedCard";
import { CommunityPostCardSkeleton } from "@/components/community/CommunityPostCardSkeleton";
import { filterUnifiedFeed } from "@/lib/community/build-unified-feed";
import type { CommunityFeedItem, CommunityFeedTab } from "@/types/community";
import { EmptyState } from "@/components/ui";

type CommunityUnifiedFeedProps = {
  items: CommunityFeedItem[];
  activeTab: CommunityFeedTab;
  searchQuery?: string;
  isLoading?: boolean;
};

export function CommunityUnifiedFeed({
  activeTab,
  isLoading = false,
  items,
  searchQuery = ""
}: CommunityUnifiedFeedProps) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const visibleItems = useMemo(() => {
    const withHidden = items.map((item) =>
      hiddenIds.includes(item.id) ? { ...item, isHidden: true } : item
    );

    return filterUnifiedFeed(withHidden, activeTab, searchQuery).filter(
      (item) => !item.isHidden
    );
  }, [activeTab, hiddenIds, items, searchQuery]);

  if (isLoading) {
    return (
      <section className="space-y-2">
        <h2 className="text-xs font-bold uppercase tracking-wide text-zinc-500">
          Bảng tin
        </h2>
        <CommunityPostCardSkeleton />
        <CommunityPostCardSkeleton />
      </section>
    );
  }

  return (
    <section className="space-y-2">
      <h2 className="text-sm font-bold text-zinc-100">Bảng tin cộng đồng</h2>
      {visibleItems.length ? (
        <div className="space-y-2">
          {visibleItems.map((item) => (
            <CommunityFeedCard
              item={item}
              key={item.id}
              onHide={(itemId) =>
                setHiddenIds((current) =>
                  current.includes(itemId) ? current : [...current, itemId]
                )
              }
            />
          ))}
        </div>
      ) : (
        <EmptyState
          action={
            <Link
              className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-black uppercase tracking-[0.1em] text-zinc-950"
              href="/community/groups"
            >
              Khám phá nhóm truyện
            </Link>
          }
          description="Theo dõi nhóm truyện hoặc tác giả để thấy bình luận và thảo luận mới."
          title="Chưa có hoạt động phù hợp."
        />
      )}
    </section>
  );
}
