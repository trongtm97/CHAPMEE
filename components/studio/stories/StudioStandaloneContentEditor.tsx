"use client";

import { useActionState } from "react";
import Link from "next/link";
import { SchedulePicker } from "@/components/studio/SchedulePicker";
import { StoryPublishChecklistPanel } from "@/components/studio/stories/StoryPublishChecklistPanel";
import { StudioStandaloneComposerField } from "@/components/studio/stories/StudioStandaloneComposerField";
import { StoryStructureBadge } from "@/components/studio/stories/StoryStructureSelector";
import { Button, Card } from "@/components/ui";
import type { StandaloneContentActionState } from "@/lib/creator/updateStandaloneStoryContent";
import { studioStoryEditHref } from "@/lib/studio/ownership";
import type { PresentationMode } from "@/types/presentation";

type StudioStandaloneContentEditorProps = {
  action: (
    previousState: StandaloneContentActionState,
    formData: FormData
  ) => Promise<StandaloneContentActionState>;
  storyId: string;
  storyTitle: string;
  storyStatus: string;
  storyVisibility: string;
  coverUrl: string | null;
  hasCover: boolean;
  hook: string | null;
  shortDescription: string | null;
  longDescription: string | null;
  seoDescription: string | null;
  presentationMode: PresentationMode;
  initialStructuredContent?: unknown | null;
  initialPlainText?: string | null;
  profileId: string;
  basePath?: string;
};

const initialState: StandaloneContentActionState = { error: null };

export function StudioStandaloneContentEditor({
  action,
  basePath = "/studio",
  coverUrl = null,
  hasCover = false,
  hook = null,
  initialPlainText = null,
  initialStructuredContent = null,
  longDescription = null,
  presentationMode,
  seoDescription = null,
  shortDescription = null,
  storyId,
  storyStatus,
  storyTitle,
  storyVisibility
}: StudioStandaloneContentEditorProps) {
  const [state, formAction, pending] = useActionState(action, initialState);

  return (
    <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <StoryStructureBadge structureType="standalone" />
          <h1 className="mt-2 text-2xl font-bold text-white">{storyTitle}</h1>
          <p className="mt-1 text-sm text-zinc-500">Sửa nội dung truyện một phần</p>
        </div>
        <Link
          className="text-sm font-semibold text-cyan-300 hover:underline"
          href={studioStoryEditHref(storyId)}
        >
          ← Quay lại chỉnh sửa truyện
        </Link>
      </div>

      <form action={formAction} className="space-y-4">
        <input name="story_id" type="hidden" value={storyId} />
        <input name="return_base_path" type="hidden" value={basePath} />

        <StudioStandaloneComposerField
          initialPlainText={initialPlainText}
          initialStructuredContent={initialStructuredContent}
          presentationMode={presentationMode}
        />

        {state.error ? (
          <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
            {state.error}
          </p>
        ) : null}

        {state.ok ? (
          <p className="rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-3 text-sm text-emerald-100">
            Đã lưu nội dung.
          </p>
        ) : null}

        <Card className="flex flex-wrap gap-2 p-4">
          <Button disabled={pending} loading={pending} type="submit">
            Lưu nội dung
          </Button>
        </Card>
      </form>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <Card className="space-y-4 p-4">
          <StoryPublishChecklistPanel
            input={{
              coverUrl,
              hasCover,
              hook,
              longDescription,
              seoDescription,
              shortDescription,
              status: storyStatus,
              structureType: "standalone",
              standaloneContentJson: initialStructuredContent,
              standalonePlainText: initialPlainText,
              title: storyTitle,
              visibility: storyVisibility
            }}
            storyId={storyId}
          />
          <SchedulePicker storyId={storyId} targetId={storyId} targetType="story" />
        </Card>
      </aside>
    </div>
  );
}
