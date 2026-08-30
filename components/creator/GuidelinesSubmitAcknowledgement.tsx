"use client";

import { useState } from "react";
import {
  PublishEpisodeConsentNotice,
  PublishStoryConsentNotice
} from "@/components/legal/ImplicitConsentNotice";

/** @deprecated Chỉ còn dùng để theo dõi intent submit (draft vs review). */
export function useGuidelinesSubmitGuard() {
  const [pendingIntent, setPendingIntent] = useState<"draft" | "review">("draft");

  return {
    pendingIntent,
    setPendingIntent
  };
}

type PublishGuidelinesNoticeProps = {
  bare?: boolean;
  variant?: "story" | "episode";
};

/** Ghi chú đồng ý ngầm định khi đăng — không còn checkbox. */
export function PublishGuidelinesNotice({
  bare = false,
  variant = "story"
}: PublishGuidelinesNoticeProps) {
  const Notice =
    variant === "episode" ? PublishEpisodeConsentNotice : PublishStoryConsentNotice;

  return (
    <div className={bare ? "" : "rounded-lg border border-zinc-800 bg-zinc-950/40 p-4"}>
      <Notice />
    </div>
  );
}

/** @deprecated Dùng PublishGuidelinesNotice */
export const GuidelinesAcknowledgementField = PublishGuidelinesNotice;
