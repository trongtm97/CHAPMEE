"use client";

import { PublishChecklist } from "@/components/studio/PublishChecklist";
import { usePublishChecklist } from "@/hooks/use-publish-checklist";
import type { StoryPublishInput } from "@/lib/publish/validate-story-before-publish";

type StoryPublishChecklistPanelProps = {
  storyId?: string | null;
  input: StoryPublishInput;
};

export function StoryPublishChecklistPanel({
  input,
  storyId
}: StoryPublishChecklistPanelProps) {
  const { rules } = usePublishChecklist({
    enabled: Boolean(storyId),
    localStory: input,
    targetId: storyId ?? undefined,
    targetType: "story"
  });

  if (!storyId) {
    return (
      <p className="text-sm text-zinc-500">
        Lưu truyện trước để xem checklist đăng và lên lịch.
      </p>
    );
  }

  return <PublishChecklist rules={rules} />;
}
