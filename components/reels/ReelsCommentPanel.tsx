"use client";

import { ReelsCommentsBody } from "@/components/reels/ReelsCommentsBody";
import type { ReelsAnalyticsContext } from "@/lib/analytics/trackReelsEvents";

type ReelsCommentPanelProps = {
  active: boolean;
  context: ReelsAnalyticsContext | null;
  onCommentCreated: () => void;
};

export function ReelsCommentPanel({
  active,
  context,
  onCommentCreated
}: ReelsCommentPanelProps) {
  if (!context) {
    return null;
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-2xl bg-white text-[#111827] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]">
      <ReelsCommentsBody
        active={active}
        context={context}
        onCommentCreated={onCommentCreated}
        variant="panel"
      />
    </div>
  );
}
