"use client";

import Link from "next/link";
import { useState } from "react";
import { StoryActionSheet } from "@/components/story/StoryActionSheet";
import type { StoryDetail } from "@/lib/stories/getStoryBySlug";
import type { StoryUserState } from "@/lib/stories/getStoryUserState";
import { studioStoryEditHref } from "@/lib/studio/ownership";
import { storyToggleFollowStoryAction } from "@/lib/stories/story-detail-actions";
import { hasStandaloneContent, isStandaloneStory } from "@/lib/stories/story-structure";
import type { ShareCardPayload } from "@/types/share";

type StoryActionsProps = {
  story: StoryDetail;
  userState: StoryUserState;
  isStoryOwner: boolean;
  returnTo: string;
  sharePayload: ShareCardPayload;
  readHref: string | null;
};

function readingProgressLabel(_story: StoryDetail, _readHref: string) {
  return "Đọc ngay";
}

export function StoryActions({
  isStoryOwner,
  readHref,
  returnTo,
  sharePayload,
  story,
  userState
}: StoryActionsProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  const standalone = isStandaloneStory(story);
  const canRead = standalone
    ? hasStandaloneContent(story)
    : Boolean(readHref);

  return (
    <section className="space-y-3">
      <div className="flex gap-2">
        {canRead && readHref ? (
          <Link
            className="tap-highlight inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-cyan-300 px-4 text-sm font-black text-zinc-950 shadow-[0_12px_28px_rgba(103,232,249,0.2)]"
            href={readHref}
          >
            {standalone ? "Đọc ngay" : readingProgressLabel(story, readHref)}
          </Link>
        ) : standalone ? (
          <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-white/[0.06] px-4 text-sm font-semibold text-zinc-500">
            Chưa có nội dung
          </span>
        ) : (
          <span className="inline-flex min-h-11 flex-1 items-center justify-center rounded-full bg-white/[0.06] px-4 text-sm font-semibold text-zinc-500">
            Chưa có chương
          </span>
        )}
        {isStoryOwner ? (
          <Link
            className="tap-highlight inline-flex min-h-11 flex-1 items-center justify-center rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 text-sm font-bold text-cyan-100"
            href={studioStoryEditHref(story.id)}
          >
            Mở trong Studio
          </Link>
        ) : (
          <form action={storyToggleFollowStoryAction} className="flex-1">
            <input name="creatorId" type="hidden" value={story.creatorId ?? ""} />
            <input name="returnTo" type="hidden" value={returnTo} />
            <input
              name="following"
              type="hidden"
              value={userState.isFollowingStory ? "false" : "true"}
            />
            <input name="storyId" type="hidden" value={story.id} />
            <input name="storySlug" type="hidden" value={story.slug} />
            <input name="storyTitle" type="hidden" value={story.title} />
            <button
              className={`tap-highlight inline-flex min-h-11 w-full items-center justify-center rounded-full border px-4 text-sm font-bold ${
                userState.isFollowingStory
                  ? "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
                  : "border-white/12 bg-white/[0.04] text-zinc-100"
              }`}
              type="submit"
            >
              {userState.isFollowingStory ? "Đang theo dõi" : "Theo dõi"}
            </button>
          </form>
        )}
        <button
          aria-label="Tùy chọn"
          className="tap-highlight inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-white/12 bg-white/[0.04] text-zinc-200"
          onClick={() => setMenuOpen(true)}
          type="button"
        >
          ⋯
        </button>
      </div>
      {!userState.isLoggedIn ? (
        <p className="text-center text-xs text-zinc-500">
          Đăng nhập để lưu truyện, theo dõi và bình luận.
        </p>
      ) : null}
      <StoryActionSheet
        isStoryOwner={isStoryOwner}
        onClose={() => setMenuOpen(false)}
        open={menuOpen}
        returnTo={returnTo}
        sharePayload={sharePayload}
        story={story}
        userState={userState}
      />
    </section>
  );
}
