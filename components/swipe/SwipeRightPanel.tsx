"use client";

import type { SwipeAnalyticsContext } from "@/lib/analytics/trackSwipeEvents";
import { SwipeAuthorPanel } from "@/components/swipe/SwipeAuthorPanel";
import { SwipeCommentPanel } from "@/components/swipe/SwipeCommentPanel";
import { SwipeStoryPanel } from "@/components/swipe/SwipeStoryPanel";

export type SwipeRightPanelTab = "comments" | "story" | "author" | "chapters";

type SwipeRightPanelProps = {
  activeTab: SwipeRightPanelTab | null;
  context: SwipeAnalyticsContext | null;
  isFollowBusy: boolean;
  onClose: () => void;
  onOpenComments: () => void;
  onToggleFollow: () => void;
};

const tabLabels: Record<SwipeRightPanelTab, string> = {
  comments: "Bình luận",
  story: "Truyện",
  author: "Tác giả",
  chapters: "Chương"
};

export function SwipeRightPanel({
  activeTab,
  context,
  isFollowBusy,
  onClose,
  onOpenComments,
  onToggleFollow
}: SwipeRightPanelProps) {
  if (!activeTab || !context) {
    return null;
  }

  return (
    <aside className="relative hidden min-h-[640px] w-[340px] max-w-[340px] overflow-hidden rounded-2xl border border-white/10 bg-[#0d131d]/95 lg:flex">
      <div className="flex min-h-0 w-full flex-col">
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <h3 className="text-sm font-bold uppercase tracking-[0.15em] text-zinc-200">
            {tabLabels[activeTab]}
          </h3>
          <button
            className="rounded-full border border-white/15 px-2.5 py-1 text-xs font-semibold text-zinc-200 hover:bg-white/10"
            onClick={onClose}
            type="button"
          >
            Đóng
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {activeTab === "comments" ? (
            <SwipeCommentPanel context={context} onOpenComments={onOpenComments} />
          ) : null}
          {activeTab === "story" ? <SwipeStoryPanel item={context.item} /> : null}
          {activeTab === "author" ? (
            <SwipeAuthorPanel
              isFollowBusy={isFollowBusy}
              item={context.item}
              onToggleFollow={onToggleFollow}
            />
          ) : null}
          {activeTab === "chapters" ? (
            <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-200/90">
                Danh sách chương
              </p>
              <p className="mt-3 text-sm leading-6 text-zinc-300">
                Danh sách chương và gợi ý liên quan sẽ được hiển thị tại đây.
              </p>
            </section>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
