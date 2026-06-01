"use client";

import {
  FEEDBACK_PRIORITY_CLASS,
  getFeedbackPriorityLabel
} from "@/lib/feedback/constants";
import type { FeedbackPriority } from "@/types/contact-settings";

export function FeedbackPriorityBadge({ priority }: { priority: FeedbackPriority | string | null }) {
  const p = (priority ?? "normal") as FeedbackPriority;
  const cls = FEEDBACK_PRIORITY_CLASS[p] ?? FEEDBACK_PRIORITY_CLASS.normal;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>
      {getFeedbackPriorityLabel(p)}
    </span>
  );
}
