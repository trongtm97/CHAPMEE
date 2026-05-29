"use client";

import { SwipeCreatorAvatar } from "@/components/swipe/SwipeCreatorAvatar";
import { SwipeIconButton } from "@/components/swipe/SwipeIconButton";
import type { SwipeAnalyticsContext } from "@/lib/analytics/trackSwipeEvents";

type SwipeActionRailProps = {
  context: SwipeAnalyticsContext;
  isBusy?: {
    follow?: boolean;
    like?: boolean;
    save?: boolean;
    share?: boolean;
  };
  onOpenComments: () => void;
  onShare: () => void;
  onToggleFollow: () => void;
  onToggleLike: () => void;
  onToggleSave: () => void;
  variant?: "mobile" | "desktop";
};

function HeartIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M12.001 21.145 10.55 19.83C5.4 15.16 2 12.08 2 8.3 2 5.22 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09A6 6 0 0 1 16.5 3C19.58 3 22 5.22 22 8.3c0 3.78-3.4 6.86-8.55 11.53L12 21.145Z" />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M4 5.75A2.75 2.75 0 0 1 6.75 3h10.5A2.75 2.75 0 0 1 20 5.75v7A2.75 2.75 0 0 1 17.25 15.5H10.9l-4.55 4.03c-.48.43-1.22.08-1.22-.56V15.5H6.75A2.75 2.75 0 0 1 4 12.75v-7Z" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M6.5 3h11A1.5 1.5 0 0 1 19 4.5v15.38a1 1 0 0 1-1.47.88L12 17.9l-5.53 2.86A1 1 0 0 1 5 19.88V4.5A1.5 1.5 0 0 1 6.5 3Z" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-7 w-7"
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M20.73 3.27a1 1 0 0 0-1.08-.22L4.85 9.1a1 1 0 0 0 .08 1.88l6.03 2.07 2.07 6.03a1 1 0 0 0 1.88.08l6.04-14.8a1 1 0 0 0-.22-1.09Z" />
    </svg>
  );
}

export function SwipeActionRail({
  context,
  isBusy,
  onOpenComments,
  onShare,
  onToggleFollow,
  onToggleLike,
  onToggleSave,
  variant = "mobile"
}: SwipeActionRailProps) {
  const item = context.item;
  const creatorHref = item.creatorId ? `/creators/${item.creatorId}` : "/swipe";
  const creatorName = item.creatorName ?? "ChapMee";

  return (
    <aside
      className={
        variant === "desktop"
          ? "w-20 shrink-0"
          : "pointer-events-none absolute bottom-[calc(7rem+env(safe-area-inset-bottom))] right-3 z-30 sm:right-4"
      }
    >
      <div
        className={`flex flex-col items-center gap-4 ${variant === "desktop" ? "pointer-events-auto" : "pointer-events-auto"}`}
      >
        <SwipeCreatorAvatar
          avatarUrl={item.creatorAvatarUrl}
          creatorHref={creatorHref}
          creatorName={creatorName}
          disabled={Boolean(isBusy?.follow)}
          following={item.isFollowingCreator}
          onFollow={onToggleFollow}
          showFollow={Boolean(item.creatorId)}
        />

        <SwipeIconButton
          active={item.isLiked}
          count={item.likeCount}
          disabled={Boolean(isBusy?.like)}
          icon={<HeartIcon />}
          onClick={onToggleLike}
        />
        <SwipeIconButton
          count={item.commentCount}
          icon={<CommentIcon />}
          onClick={onOpenComments}
        />
        <SwipeIconButton
          active={item.isSaved}
          count={item.saveCount}
          disabled={Boolean(isBusy?.save)}
          icon={<SaveIcon />}
          onClick={onToggleSave}
        />
        <SwipeIconButton
          count={item.shareCount}
          disabled={Boolean(isBusy?.share)}
          icon={<ShareIcon />}
          onClick={onShare}
        />
      </div>
    </aside>
  );
}
