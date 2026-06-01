"use client";

import { FEEDBACK_STATUS_CLASS, getFeedbackStatusLabel } from "@/lib/feedback/constants";
import type { FeedbackStatus } from "@/types/contact-settings";

export function FeedbackStatusBadge({ status }: { status: FeedbackStatus | string }) {
  const cls = FEEDBACK_STATUS_CLASS[status as FeedbackStatus] ?? FEEDBACK_STATUS_CLASS.new;
  return (
    <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${cls}`}>
      {getFeedbackStatusLabel(status)}
    </span>
  );
}
