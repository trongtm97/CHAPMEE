"use client";

import Link from "next/link";
import { useActionState, useCallback, useMemo, useState } from "react";
import {
  GuidelinesAcknowledgementField,
  useGuidelinesSubmitGuard
} from "@/components/creator/GuidelinesSubmitAcknowledgement";
import { AutosaveStatusBar } from "@/components/editor/AutosaveStatus";
import { StudioLocalDraftRecovery } from "@/components/editor/StudioLocalDraftRecovery";
import { VersionHistoryPanel } from "@/components/editor/VersionHistoryPanel";
import { Button, Card, Input, Textarea } from "@/components/ui";
import { EpisodeEditorSidePanel } from "@/components/studio/episodes/EpisodeEditorSidePanel";
import { SchedulePicker } from "@/components/studio/SchedulePicker";
import { useAutosave } from "@/hooks/useAutosave";
import type { EpisodeFormActionState } from "@/lib/creator/createEpisode";
import type { CreatorEpisodeFormData } from "@/lib/creator/getCreatorEpisodeById";
import {
  isDraftNewerThan,
  parseChapterDraftContent
} from "@/lib/studio/draft-content";
import { createExcerpt } from "@/lib/text/createExcerpt";
import { countWords } from "@/lib/text/countWords";
import type { ChapterDraftContent } from "@/types/drafts";
import type { StudioDraftRecord, StudioDraftVersionRecord } from "@/types/drafts";

type StudioEpisodeEditorProps = {
  action: (
    previousState: EpisodeFormActionState,
    formData: FormData
  ) => Promise<EpisodeFormActionState>;
  basePath?: string;
  defaultEpisodeNumber: number;
  episode?: CreatorEpisodeFormData["episode"];
  previewReaderHref?: string;
  previewSwipeHref?: string;
  profileId: string;
  savedDraft?: StudioDraftRecord | null;
  story: NonNullable<CreatorEpisodeFormData["story"]>;
};

const initialState: EpisodeFormActionState = {
  error: null
};

function buildInitialChapterState(
  episode: CreatorEpisodeFormData["episode"] | undefined,
  savedDraft: StudioDraftRecord | null | undefined,
  defaultEpisodeNumber: number
): ChapterDraftContent {
  const fromDraft = parseChapterDraftContent(savedDraft?.content);

  return {
    content: fromDraft.content ?? episode?.content ?? "",
    episodeNumber:
      fromDraft.episodeNumber ?? episode?.episode_number ?? defaultEpisodeNumber,
    excerpt: fromDraft.excerpt ?? episode?.excerpt ?? "",
    title: fromDraft.title ?? episode?.title ?? ""
  };
}

export function StudioEpisodeEditor({
  action,
  basePath = "/studio",
  defaultEpisodeNumber,
  episode,
  previewReaderHref,
  previewSwipeHref,
  profileId,
  savedDraft,
  story
}: StudioEpisodeEditorProps) {
  const initial = buildInitialChapterState(episode, savedDraft, defaultEpisodeNumber);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [episodeNumber, setEpisodeNumber] = useState(initial.episodeNumber);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [excerpt, setExcerpt] = useState(initial.excerpt);

  const wordCount = useMemo(() => countWords(content), [content]);
  const previewExcerpt = useMemo(
    () => excerpt.trim() || createExcerpt(content),
    [content, excerpt]
  );
  const episodeStatus = episode?.status ?? "draft";

  const getPayload = useCallback(
    () => ({
      content: {
        content,
        episodeNumber,
        excerpt,
        title
      } satisfies ChapterDraftContent,
      plainText: content,
      title: title.trim() || `Chương ${episodeNumber}`
    }),
    [content, episodeNumber, excerpt, title]
  );

  const autosave = useAutosave({
    chapterId: episode?.id ?? null,
    draftType: "chapter",
    enabled: Boolean(profileId),
    getPayload,
    initialDraftId: savedDraft?.id ?? null,
    initialLastSavedAt: savedDraft?.lastSavedAt ?? null,
    profileId,
    storyId: story.id
  });

  const {
    acknowledged,
    ackError,
    guardSubmit,
    setAcknowledged,
    setPendingIntent
  } = useGuidelinesSubmitGuard();

  const handleFieldChange = useCallback(
    <T,>(setter: (value: T) => void, value: T) => {
      setter(value);
      autosave.markDirty();
    },
    [autosave]
  );

  const applyDraftContent = useCallback((draftContent: Record<string, unknown>) => {
    const parsed = parseChapterDraftContent(draftContent);

    if (parsed.episodeNumber !== undefined) {
      setEpisodeNumber(parsed.episodeNumber);
    }

    if (parsed.title !== undefined) {
      setTitle(parsed.title);
    }

    if (parsed.content !== undefined) {
      setContent(parsed.content);
    }

    if (parsed.excerpt !== undefined) {
      setExcerpt(parsed.excerpt);
    }

    autosave.markDirty();
  }, [autosave]);

  const handleRestoreVersion = useCallback(
    (version: StudioDraftVersionRecord) => {
      applyDraftContent(version.content);
      void autosave.saveNow(true);
    },
    [applyDraftContent, autosave]
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      guardSubmit(event);

      if (!event.defaultPrevented) {
        void autosave.saveNow(true);
      }
    },
    [autosave, guardSubmit]
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <AutosaveStatusBar
          errorMessage={autosave.errorMessage}
          lastSavedAt={autosave.lastSavedAt}
          status={autosave.status}
        />

        {autosave.localRecovery?.snapshot ? (
          <StudioLocalDraftRecovery
            onApply={() => {
              const snapshot = autosave.applyLocalRecovery();

              if (snapshot) {
                applyDraftContent(snapshot.content);
              }
            }}
            onDismiss={autosave.dismissLocalRecovery}
            snapshot={autosave.localRecovery.snapshot}
          />
        ) : null}

        {savedDraft &&
        isDraftNewerThan(savedDraft.lastSavedAt, null) &&
        !autosave.localRecovery ? (
          <p className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm text-sky-100">
            Đã tải bản nháp autosave gần nhất (
            {new Intl.DateTimeFormat("vi-VN", {
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              month: "2-digit"
            }).format(new Date(savedDraft.lastSavedAt))}
            ).
          </p>
        ) : null}

        <Card>
          <form
            action={formAction}
            className="space-y-6"
            data-studio-episode-form
            onSubmit={handleSubmit}
          >
            <input name="story_id" type="hidden" value={story.id} />
            <input name="return_base_path" type="hidden" value={basePath} />
            {episode ? (
              <input name="episode_id" type="hidden" value={episode.id} />
            ) : null}

            <div className="grid gap-5 lg:grid-cols-[120px_minmax(0,1fr)]">
              <Input
                disabled={pending}
                label="Số chương"
                min={1}
                name="episode_number"
                onChange={(event) =>
                  handleFieldChange(
                    setEpisodeNumber,
                    Number(event.target.value) || 1
                  )
                }
                required
                type="number"
                value={episodeNumber}
              />
              <Input
                disabled={pending}
                label="Tiêu đề"
                name="title"
                onChange={(event) => handleFieldChange(setTitle, event.target.value)}
                placeholder="Tiêu đề chương"
                required
                value={title}
              />
            </div>

            <Textarea
              disabled={pending}
              label="Nội dung"
              name="content"
              onChange={(event) => handleFieldChange(setContent, event.target.value)}
              placeholder="Viết chương tại đây..."
              required
              rows={24}
              className="min-h-[34rem] text-base leading-8"
              value={content}
            />

            <Textarea
              disabled={pending}
              label="Tóm tắt ngắn"
              name="excerpt"
              onChange={(event) => handleFieldChange(setExcerpt, event.target.value)}
              placeholder="Để trống để tự tạo tóm tắt."
              rows={4}
              value={excerpt}
            />

            <p className="text-sm text-zinc-500">
              Phân loại độ tuổi: chỉnh tại form truyện.{" "}
              <Link className="text-cyan-300" href="/community-guidelines" target="_blank">
                Quy định cộng đồng
              </Link>
            </p>

            <GuidelinesAcknowledgementField
              acknowledged={acknowledged}
              disabled={pending}
              error={ackError}
              onAckChange={setAcknowledged}
              variant="episode"
            />

            <div className="grid gap-3 md:grid-cols-2">
              <Button
                loading={pending}
                name="intent"
                onClick={() => {
                  setPendingIntent("draft");
                  void autosave.saveNow(true);
                }}
                type="submit"
                value="draft"
                variant="secondary"
              >
                Lưu nháp
              </Button>
              <Button
                loading={pending}
                name="intent"
                onClick={() => setPendingIntent("review")}
                type="submit"
                value="review"
              >
                Gửi duyệt
              </Button>
            </div>

            {state.error ? (
              <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
                {state.error}
              </p>
            ) : null}
          </form>
        </Card>
      </div>

      <div className="space-y-4">
        {episode ? (
          <SchedulePicker
            storyId={story.id}
            targetId={episode.id}
            targetType="chapter"
          />
        ) : null}
        <VersionHistoryPanel
          draftId={autosave.draftId}
          onRestored={handleRestoreVersion}
        />
        <EpisodeEditorSidePanel
          basePath={basePath}
          episodeStatus={episodeStatus}
          excerpt={previewExcerpt}
          previewReaderHref={previewReaderHref}
          previewSwipeHref={previewSwipeHref}
          storyStatus={story.status}
          storyTitle={story.title}
          wordCount={wordCount}
        />
      </div>
    </div>
  );
}
