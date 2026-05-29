"use client";

import { useMemo, useState } from "react";
import { CommunityFeedCard } from "@/components/community/CommunityFeedCard";
import { buildUnifiedFeed } from "@/lib/community/build-unified-feed";
import type { CommunityPost } from "@/lib/community/getCommunityFeed";
import type { AuthorCommunityGroup } from "@/types/community";
import { EmptyState } from "@/components/ui";

const tabs = [
  { id: "posts", label: "Bài đăng" },
  { id: "qa", label: "Hỏi tác giả" },
  { id: "stories", label: "Truyện" },
  { id: "poll", label: "Poll" },
  { id: "updates", label: "Thông báo" }
] as const;

type AuthorGroupFeedProps = {
  authorGroup: AuthorCommunityGroup;
  posts: CommunityPost[];
};

export function AuthorGroupFeed({ authorGroup, posts }: AuthorGroupFeedProps) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("posts");

  const items = useMemo(() => {
    const built = buildUnifiedFeed(posts, [], [authorGroup]);

    if (tab === "qa" || tab === "updates") {
      return built.filter((item) => item.kind === "author_reply");
    }

    if (tab === "poll") {
      return built.filter((item) => item.kind === "poll");
    }

    if (tab === "stories") {
      return built.filter((item) => Boolean(item.storyTitle));
    }

    return built;
  }, [authorGroup, posts, tab]);

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
          description="Đặt câu hỏi cho tác giả hoặc theo dõi để nhận cập nhật."
          title="Chưa có hoạt động từ tác giả."
        />
      )}
    </div>
  );
}
