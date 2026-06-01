"use client";

import { PublishChecklist } from "@/components/studio/PublishChecklist";
import { usePublishChecklist } from "@/hooks/use-publish-checklist";
import type { ReelsPublishInput } from "@/lib/publish/validate-reels-before-publish";

type ReelsPublishChecklistPanelProps = {
  reelId?: string | null;
  input: ReelsPublishInput;
};

export function ReelsPublishChecklistPanel({
  input,
  reelId
}: ReelsPublishChecklistPanelProps) {
  const { rules } = usePublishChecklist({
    enabled: Boolean(reelId),
    localReels: input,
    targetId: reelId ?? undefined,
    targetType: "reels"
  });

  return <PublishChecklist compact rules={rules} />;
}
