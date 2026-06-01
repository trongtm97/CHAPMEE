"use client";

import { Button } from "@/components/ui";
import {
  trackFeedComment,
  trackFeedFollow,
  trackFeedSave,
  type ReelsAnalyticsContext
} from "@/lib/analytics/trackReelsEvents";

type ReelsActionsProps = {
  context: ReelsAnalyticsContext;
};

function HeartIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 20.2 4.8 12.9a4.8 4.8 0 0 1 6.8-6.8L12 7.4l.4-1.3a4.8 4.8 0 0 1 6.8 6.8L12 20.2Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function CommentIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path
        d="M5 6.5h14a1 1 0 0 1 1 1V15a1 1 0 0 1-1 1H9.2L5 20v-4H5a1 1 0 0 1-1-1V7.5a1 1 0 0 1 1-1Z"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

function UserPlusIcon() {
  return (
    <svg aria-hidden="true" className="size-4 shrink-0" fill="none" viewBox="0 0 24 24">
      <path
        d="M12 12.5a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7 7a7 7 0 0 1 14 0"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path d="M19 9.5v5M16.5 12h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.8" />
    </svg>
  );
}

export function ReelsActions({ context }: ReelsActionsProps) {
  const actionClassName =
    "w-full justify-start gap-2 px-3 py-2.5 text-[0.78rem] normal-case tracking-normal sm:px-3.5";

  return (
    <div className="grid grid-cols-2 gap-2">
      <Button className={actionClassName} variant="ghost">
        <HeartIcon />
        <span>Thích</span>
      </Button>
      <Button
        className={actionClassName}
        onClick={() => trackFeedComment(context)}
        variant="ghost"
      >
        <CommentIcon />
        <span>Bình luận</span>
      </Button>
      <Button
        className={actionClassName}
        onClick={() => trackFeedSave(context)}
        variant="ghost"
      >
        <PlusIcon />
        <span>Lưu</span>
      </Button>
      <Button
        className={actionClassName}
        onClick={() => trackFeedFollow(context)}
        variant="ghost"
      >
        <UserPlusIcon />
        <span>Theo dõi</span>
      </Button>
    </div>
  );
}
