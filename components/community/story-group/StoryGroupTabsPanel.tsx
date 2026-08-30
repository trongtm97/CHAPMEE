"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CommunityFeedCard } from "@/components/community/CommunityFeedCard";
import { StoryGroupActivityFeed } from "@/components/community/story-group/StoryGroupActivityFeed";
import type { StoryGroupActivityFilterPresence } from "@/components/community/story-group/StoryGroupActivityFilters";
import { buildFeedItemsFromPosts } from "@/lib/community/build-unified-feed";
import type { CommunityPost } from "@/lib/community/getCommunityFeed";
import type { EnrichedGroupFeedItemView } from "@/lib/community-sync/enrich-group-feed-items";
import type { StoryCommunityGroup } from "@/types/community";
import { EmptyState } from "@/components/ui";

export type StoryGroupTabId = "activity" | "discussion";

const TABS: Array<{ id: StoryGroupTabId; label: string }> = [
  { id: "activity", label: "Hoạt động" },
  { id: "discussion", label: "Thảo luận" }
];

function parseTab(value: string | null): StoryGroupTabId {
  if (value === "discussion") {
    return "discussion";
  }
  return "activity";
}

type StoryGroupTabsPanelProps = {
  storyId: string;
  storySlug: string;
  storyGroup: StoryCommunityGroup;
  storyPosts: CommunityPost[];
  initialActivity: {
    items: EnrichedGroupFeedItemView[];
    nextCursor: string | null;
    hasMore: boolean;
  };
  readerChapterNumber: number | null;
  filterPresence: StoryGroupActivityFilterPresence;
  initialTab?: StoryGroupTabId;
};

export function StoryGroupTabsPanel({
  filterPresence,
  initialActivity,
  initialTab = "activity",
  readerChapterNumber,
  storyGroup,
  storyId,
  storyPosts,
  storySlug
}: StoryGroupTabsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<StoryGroupTabId>(
    parseTab(searchParams.get("tab")) || initialTab
  );

  const discussionItems = useMemo(() => {
    const built = buildFeedItemsFromPosts(storyPosts, [storyGroup], [], {
      includeFallbackHighlight: false
    });
    return built.filter(
      (item) =>
        item.kind === "user_post" ||
        item.kind === "story_group_post" ||
        item.kind === "review"
    );
  }, [storyGroup, storyPosts]);

  function selectTab(nextTab: StoryGroupTabId) {
    setTab(nextTab);
    const params = new URLSearchParams(searchParams.toString());
    if (nextTab === "activity") {
      params.delete("tab");
    } else {
      params.set("tab", nextTab);
    }
    const query = params.toString();
    router.replace(
      query ? `/community/story/${storySlug}?${query}` : `/community/story/${storySlug}`,
      { scroll: false }
    );
  }

  return (
    <div className="space-y-3">
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex min-w-max gap-2" role="tablist">
          {TABS.map((entry) => (
            <button
              aria-selected={tab === entry.id}
              className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                tab === entry.id
                  ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-100"
                  : "border-white/10 text-zinc-400 hover:border-white/20"
              }`}
              key={entry.id}
              onClick={() => selectTab(entry.id)}
              role="tab"
              type="button"
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "activity" ? (
        <StoryGroupActivityFeed
          filterPresence={filterPresence}
          initialHasMore={initialActivity.hasMore}
          initialItems={initialActivity.items}
          initialNextCursor={initialActivity.nextCursor}
          readerChapterNumber={readerChapterNumber}
          storyId={storyId}
        />
      ) : null}

      {tab === "discussion" ? (
        discussionItems.length ? (
          <div className="space-y-3">
            {discussionItems.map((item) => (
              <CommunityFeedCard item={item} key={item.id} />
            ))}
          </div>
        ) : (
          <EmptyState
            description="Tạo bài thảo luận đầu tiên hoặc chia sẻ cảm nhận về truyện."
            title="Chưa có bài thảo luận"
          />
        )
      ) : null}
    </div>
  );
}
