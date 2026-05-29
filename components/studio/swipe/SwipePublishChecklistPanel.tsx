"use client";

import { PublishChecklist } from "@/components/studio/PublishChecklist";
import { usePublishChecklist } from "@/hooks/use-publish-checklist";
import type { SwipePublishInput } from "@/lib/publish/validate-swipe-before-publish";

type SwipePublishChecklistPanelProps = {
  swipeId?: string | null;
  input: SwipePublishInput;
};

export function SwipePublishChecklistPanel({
  input,
  swipeId
}: SwipePublishChecklistPanelProps) {
  const { rules } = usePublishChecklist({
    enabled: Boolean(swipeId),
    localSwipe: input,
    targetId: swipeId ?? undefined,
    targetType: "swipe"
  });

  return <PublishChecklist compact rules={rules} />;
}
