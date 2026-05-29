"use client";

import { PublishChecklist } from "@/components/studio/PublishChecklist";
import { usePublishChecklist } from "@/hooks/use-publish-checklist";
import type { StoryPublishInput } from "@/lib/publish/validate-story-before-publish";

type ChapterPublishChecklistPanelProps = {
  canPublish: boolean;
  content: string;
  episodeId?: string | null;
  storyId: string;
  title: string;
  authorNote?: string;
  seoDescription?: string | null;
  isSaved?: boolean;
  storyInput?: StoryPublishInput | null;
};

export function ChapterPublishChecklistPanel({
  authorNote = "",
  canPublish,
  content,
  episodeId,
  isSaved = true,
  seoDescription,
  storyId,
  storyInput,
  title
}: ChapterPublishChecklistPanelProps) {
  const { rules } = usePublishChecklist({
    enabled: canPublish && Boolean(episodeId),
    localChapter: {
      authorNote,
      content,
      isSaved,
      seoDescription,
      storyValid: Boolean(storyId),
      title
    },
    localStory: storyInput ?? undefined,
    storyId,
    targetId: episodeId ?? undefined,
    targetType: "chapter"
  });

  if (!canPublish) {
    return (
      <PublishChecklist
        rules={[
          {
            blocking: true,
            id: "episode",
            label: "Lưu chương trước khi đăng",
            message: "Lưu chương trước khi đăng hoặc lên lịch.",
            status: "error",
            targetType: "chapter"
          }
        ]}
      />
    );
  }

  return <PublishChecklist compact rules={rules} />;
}
