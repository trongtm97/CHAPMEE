"use client";

import { useMemo, useState } from "react";
import { CommunityFeedCard } from "@/components/community/CommunityFeedCard";
import { buildFeedItemsFromPosts } from "@/lib/community/build-unified-feed";
import type { CommunityPost } from "@/lib/community/getCommunityFeed";
import type { StoryCommunityGroup } from "@/types/community";
import { EmptyState } from "@/components/ui";

const tabs = [
  { id: "feed", label: "Bảng tin" },
  { id: "hot", label: "Bình luận hot" },
  { id: "review", label: "Review" },
  { id: "poll", label: "Poll" },
  { id: "theory", label: "Fan theory" }
] as const;

type StoryGroupFeedProps = {
  storyGroup: StoryCommunityGroup;
  posts: CommunityPost[];
};

export function StoryGroupFeed({ posts, storyGroup }: StoryGroupFeedProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("feed");

  const items = useMemo(() => {
    const built = buildFeedItemsFromPosts(posts, [storyGroup], [], {
      includeFallbackHighlight: false
    });

    if (tab === "review") {
      return built.filter((item) => item.kind === "review");
    }

    if (tab === "poll") {
      return built.filter((item) => item.kind === "poll");
    }

    if (tab === "hot") {
      return built
        .filter(
          (item) =>
            item.kind === "story_comment_highlight" || item.kind === "author_reply"
        )
        .sort((a, b) => b.hotScore - a.hotScore);
    }

    if (tab === "theory") {
      return built.filter((item) => item.kind === "user_post" || item.kind === "story_group_post");
    }

    return built;
  }, [posts, storyGroup, tab]);

  return (
    <div className="space-y-3">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2">
          {tabs.map((entry) => (
            <button
              className={`rounded-full border px-3 py-2 text-xs font-bold ${
                tab === entry.id
                  ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 text-zinc-400"
              }`}
              key={entry.id}
              onClick={() => setTab(entry.id)}
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {items.length ? (
        items.map((item) => <CommunityFeedCard item={item} key={item.id} />)
      ) : (
        <EmptyState
          description="Hãy là người đầu tiên đặt câu hỏi hoặc chia sẻ theory."
          title="Chưa có bài trong nhóm này."
        />
      )}
    </div>
  );
}
