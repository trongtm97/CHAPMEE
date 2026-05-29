"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CommunityPostCard } from "@/components/community/CommunityPostCard";
import { CommunityPostCardSkeleton } from "@/components/community/CommunityPostCardSkeleton";
import { EmptyState } from "@/components/ui";
import {
  filterPostsByQuery,
  sortEnrichedPosts
} from "@/lib/community/build-unified-feed";
import type { CommunityFeedTab, EnrichedCommunityPost } from "@/types/community";

type CommunityMainFeedProps = {
  posts: EnrichedCommunityPost[];
  activeTab: CommunityFeedTab;
  searchQuery?: string;
  isLoading?: boolean;
};

export function CommunityMainFeed({
  activeTab,
  isLoading = false,
  posts,
  searchQuery = ""
}: CommunityMainFeedProps) {
  const [hiddenIds, setHiddenIds] = useState<string[]>([]);

  const visiblePosts = useMemo(() => {
    const withoutHidden = posts.map((post) =>
      hiddenIds.includes(post.id) ? { ...post, isHidden: true } : post
    );
    const filtered = filterPostsByQuery(
      sortEnrichedPosts(withoutHidden, activeTab),
      searchQuery
    );

    return filtered.filter((post) => !post.isHidden);
  }, [activeTab, hiddenIds, posts, searchQuery]);

  if (isLoading) {
    return (
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-zinc-100">Đang bàn luận</h2>
        <CommunityPostCardSkeleton />
        <CommunityPostCardSkeleton />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-bold text-zinc-100">Đang bàn luận</h2>
      {visiblePosts.length ? (
        <div className="space-y-3">
          {visiblePosts.map((post) => (
            <CommunityPostCard
              key={post.id}
              onHide={(postId) =>
                setHiddenIds((current) =>
                  current.includes(postId) ? current : [...current, postId]
                )
              }
              post={post}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          action={
            <Link
              className="tap-highlight inline-flex min-h-11 items-center justify-center rounded-full bg-cyan-300 px-5 text-sm font-black uppercase tracking-[0.1em] text-zinc-950"
              href="/community/new?type=discussion"
            >
              Tạo bài đầu tiên
            </Link>
          }
          description="Đặt câu hỏi về truyện bạn vừa đọc hoặc chia sẻ cảm nhận ngắn."
          title="Chưa có thảo luận nào."
        />
      )}
    </section>
  );
}
