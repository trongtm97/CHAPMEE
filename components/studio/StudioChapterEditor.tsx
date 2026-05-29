"use client";

import Link from "next/link";
import {
  useActionState,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  GuidelinesAcknowledgementField,
  useGuidelinesSubmitGuard
} from "@/components/creator/GuidelinesSubmitAcknowledgement";
import { AutosaveStatusBar } from "@/components/editor/AutosaveStatus";
import { EditorCanvas, type EditorCanvasHandle } from "@/components/editor/EditorCanvas";
import { EditorPreview } from "@/components/editor/EditorPreview";
import { InsertImageDialog } from "@/components/editor/InsertImageDialog";
import { SaveAsTemplateDialog } from "@/components/editor/SaveAsTemplateDialog";
import { TemplatePicker } from "@/components/editor/TemplatePicker";
import { EditorToolbar } from "@/components/editor/EditorToolbar";
import { consumePendingTemplateInsert } from "@/lib/studio/pending-template";
import { SEOAssistantPanel } from "@/components/studio/SEOAssistantPanel";
import { shouldIndexEpisode } from "@/lib/seo/should-index";
import { countImageBlocksInContent } from "@/lib/editor/chapter-image-block";
import { StudioLocalDraftRecovery } from "@/components/editor/StudioLocalDraftRecovery";
import { VersionHistoryPanel } from "@/components/editor/VersionHistoryPanel";
import { Button, Input, Textarea } from "@/components/ui";
import { ChapterPublishChecklistPanel } from "@/components/studio/ChapterPublishChecklistPanel";
import { SchedulePicker } from "@/components/studio/SchedulePicker";
import { StudioStatusBadge } from "@/components/studio/StudioStatusBadge";
import { useAutosave } from "@/hooks/useAutosave";
import type { EpisodeFormActionState } from "@/lib/creator/createEpisode";
import type { CreatorEpisodeFormData } from "@/lib/creator/getCreatorEpisodeById";
import {
  formatEditorWordCount,
  formatReadTimeLabel,
  getEditorStats
} from "@/lib/editor/count-words";
import { sanitizePlainContent } from "@/lib/editor/sanitize-content";
import { applyTextareaFormat } from "@/lib/editor/text-format";
import { parseChapterDraftContent } from "@/lib/studio/draft-content";
import { resolveChapterDisplayStatus } from "@/lib/studio/status-labels";
import { createExcerpt } from "@/lib/text/createExcerpt";
import type { EditorViewMode } from "@/types/editor";
import { CHAPTER_IMAGE_MAX_PER_CHAPTER } from "@/types/chapter-images";
import type { ChapterDraftContent } from "@/types/drafts";
import type { StudioDraftRecord, StudioDraftVersionRecord } from "@/types/drafts";

type StudioChapterEditorProps = {
  action: (
    previousState: EpisodeFormActionState,
    formData: FormData
  ) => Promise<EpisodeFormActionState>;
  authorPenName?: string | null;
  backHref: string;
  defaultEpisodeNumber: number;
  episode?: CreatorEpisodeFormData["episode"];
  profileId: string;
  savedDraft?: StudioDraftRecord | null;
  story: NonNullable<CreatorEpisodeFormData["story"]>;
};

const initialState: EpisodeFormActionState = {
  error: null
};

const MAX_UNDO = 40;

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

export function StudioChapterEditor({
  action,
  authorPenName,
  backHref,
  defaultEpisodeNumber,
  episode,
  profileId,
  savedDraft,
  story
}: StudioChapterEditorProps) {
  const initial = buildInitialChapterState(episode, savedDraft, defaultEpisodeNumber);
  const [state, formAction, pending] = useActionState(action, initialState);
  const [episodeNumber, setEpisodeNumber] = useState(initial.episodeNumber);
  const [title, setTitle] = useState(initial.title);
  const [content, setContent] = useState(initial.content);
  const [authorNote, setAuthorNote] = useState(initial.excerpt);
  const [seoTitle, setSeoTitle] = useState(episode?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(episode?.seo_description ?? "");
  const [seoKeywords, setSeoKeywords] = useState<string[]>(episode?.seo_keywords ?? []);
  const chapterIndexable = shouldIndexEpisode({
    episodeStatus: episode?.status,
    storyStatus: story.status,
    storyVisibility: story.visibility
  });
  const [viewMode, setViewMode] = useState<EditorViewMode>("write");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [publishPanelOpen, setPublishPanelOpen] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [pendingTemplateId, setPendingTemplateId] = useState<string | null>(null);
  const canvasRef = useRef<EditorCanvasHandle>(null);
  const undoStack = useRef<string[]>([initial.content]);
  const redoStack = useRef<string[]>([]);
  const skipHistoryRef = useRef(false);

  const stats = useMemo(() => getEditorStats(content), [content]);
  const imageCount = useMemo(() => countImageBlocksInContent(content), [content]);
  const imageLimitReached = imageCount >= CHAPTER_IMAGE_MAX_PER_CHAPTER;
  const displayStatus = resolveChapterDisplayStatus({
    status: episode?.status ?? "draft"
  });
  const canSchedule = Boolean(episode?.id);

  const getPayload = useCallback(
    () => ({
      content: {
        content,
        episodeNumber,
        excerpt: authorNote,
        title
      } satisfies ChapterDraftContent,
      plainText: content,
      title: title.trim() || `Chương ${episodeNumber}`
    }),
    [authorNote, content, episodeNumber, title]
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

  const pushHistory = useCallback((next: string) => {
    const stack = undoStack.current;
    const last = stack[stack.length - 1];

    if (last !== next) {
      stack.push(next);

      if (stack.length > MAX_UNDO) {
        stack.shift();
      }

      redoStack.current = [];
    }
  }, []);

  const handleContentChange = useCallback(
    (value: string) => {
      const sanitized = sanitizePlainContent(value);

      if (!skipHistoryRef.current) {
        pushHistory(sanitized);
      }

      skipHistoryRef.current = false;
      setContent(sanitized);
      autosave.markDirty();
    },
    [autosave, pushHistory]
  );

  const handleFieldChange = useCallback(
    <T,>(setter: (value: T) => void, value: T) => {
      setter(value);
      autosave.markDirty();
    },
    [autosave]
  );

  const applyDraftContent = useCallback(
    (draftContent: Record<string, unknown>) => {
      const parsed = parseChapterDraftContent(draftContent);

      if (parsed.episodeNumber !== undefined) {
        setEpisodeNumber(parsed.episodeNumber);
      }

      if (parsed.title !== undefined) {
        setTitle(parsed.title);
      }

      if (parsed.content !== undefined) {
        skipHistoryRef.current = true;
        setContent(parsed.content);
        pushHistory(parsed.content);
      }

      if (parsed.excerpt !== undefined) {
        setAuthorNote(parsed.excerpt);
      }

      autosave.markDirty();
    },
    [autosave, pushHistory]
  );

  const handleRestoreVersion = useCallback(
    (version: StudioDraftVersionRecord) => {
      applyDraftContent(version.content);
      void autosave.saveNow(true);
    },
    [applyDraftContent, autosave]
  );

  const handleFormat = useCallback(
    (action: Parameters<typeof applyTextareaFormat>[1]) => {
      const textarea = canvasRef.current?.getTextarea();

      if (!textarea) {
        return;
      }

      const next = applyTextareaFormat(textarea, action);
      handleContentChange(next);
    },
    [handleContentChange]
  );

  const handleUndo = useCallback(() => {
    const stack = undoStack.current;

    if (stack.length <= 1) {
      return;
    }

    const current = stack.pop()!;

    redoStack.current.push(current);
    const previous = stack[stack.length - 1]!;
    skipHistoryRef.current = true;
    setContent(previous);
    autosave.markDirty();
  }, [autosave]);

  const handleRedo = useCallback(() => {
    const next = redoStack.current.pop();

    if (!next) {
      return;
    }

    undoStack.current.push(next);
    skipHistoryRef.current = true;
    setContent(next);
    autosave.markDirty();
  }, [autosave]);

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      guardSubmit(event);

      if (!event.defaultPrevented) {
        void autosave.saveNow(true);
      }
    },
    [autosave, guardSubmit]
  );

  const openPublishPanel = useCallback(() => {
    setMobileMenuOpen(false);
    setPublishPanelOpen(true);
  }, []);

  const handleOpenInsertImage = useCallback(async () => {
    if (!episode?.id && !autosave.draftId) {
      await autosave.saveNow(true);
    }

    setImageDialogOpen(true);
  }, [autosave, episode?.id]);

  const handleOpenTemplatePicker = useCallback(async () => {
    if (!episode?.id && !autosave.draftId) {
      await autosave.saveNow(true);
    }

    setTemplatePickerOpen(true);
  }, [autosave, episode?.id]);

  useEffect(() => {
    const pending = consumePendingTemplateInsert();

    if (pending) {
      setPendingTemplateId(pending);
      setTemplatePickerOpen(true);
    }
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const isMeta = event.metaKey || event.ctrlKey;

      if (!isMeta) {
        return;
      }

      if (event.key.toLowerCase() === "s") {
        event.preventDefault();
        void autosave.saveNow(true);
        document
          .querySelector<HTMLFormElement>("form[data-studio-chapter-form]")
          ?.requestSubmit();
        return;
      }

      if (viewMode !== "write") {
        return;
      }

      if (event.key.toLowerCase() === "b") {
        event.preventDefault();
        handleFormat("bold");
      }

      if (event.key.toLowerCase() === "i") {
        event.preventDefault();
        handleFormat("italic");
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [autosave, handleFormat, viewMode]);

  const statsLabel = `${formatEditorWordCount(stats.wordCount)} từ · ${new Intl.NumberFormat("vi-VN").format(stats.characterCount)} ký tự · ${formatReadTimeLabel(stats.readTimeMinutes)}`;

  return (
    <div className="space-y-4">
      <header className="sticky top-0 z-20 -mx-1 space-y-3 border-b border-white/10 bg-[#070b12]/95 px-1 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <Link
            className="inline-flex h-10 shrink-0 items-center rounded-lg border border-white/10 px-3 text-sm font-semibold text-zinc-200 hover:bg-white/5"
            href={backHref}
          >
            ←
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-zinc-500" title={story.title}>
              {story.title}
            </p>
            <h1 className="line-clamp-2 text-base font-bold text-white sm:text-lg">
              {episode ? title || "Chỉnh sửa chương" : "Chương mới"}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StudioStatusBadge kind="chapter" status={displayStatus} />
              <AutosaveStatusBar
                errorMessage={autosave.errorMessage}
                lastSavedAt={autosave.lastSavedAt}
                status={autosave.status}
              />
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 md:flex">
            <ViewModeToggle onChange={setViewMode} value={viewMode} />
            <Button
              onClick={() => void autosave.saveNow(true)}
              type="button"
              variant="secondary"
            >
              Lưu
            </Button>
            <Button
              disabled={!canSchedule}
              onClick={openPublishPanel}
              title={
                canSchedule ? undefined : "Lưu chương trước khi đăng hoặc lên lịch"
              }
              type="button"
              variant="secondary"
            >
              Lên lịch
            </Button>
            <Button
              disabled={!canSchedule}
              onClick={openPublishPanel}
              title={
                canSchedule ? undefined : "Lưu chương trước khi đăng hoặc lên lịch"
              }
              type="button"
            >
              Đăng ngay
            </Button>
          </div>

          <div className="relative md:hidden">
            <button
              aria-expanded={mobileMenuOpen}
              aria-label="Tùy chọn"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-lg text-zinc-200"
              onClick={() => setMobileMenuOpen((open) => !open)}
              type="button"
            >
              ⋮
            </button>
            {mobileMenuOpen ? (
              <div className="absolute right-0 top-11 z-30 w-52 rounded-xl border border-white/10 bg-zinc-950 p-2 shadow-xl">
                <ViewModeToggle
                  className="mb-2 w-full"
                  onChange={(mode) => {
                    setViewMode(mode);
                    setMobileMenuOpen(false);
                  }}
                  value={viewMode}
                />
                <button
                  className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-zinc-200 hover:bg-white/10"
                  onClick={() => {
                    void autosave.saveNow(true);
                    setMobileMenuOpen(false);
                  }}
                  type="button"
                >
                  Lưu
                </button>
                <button
                  className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-40"
                  disabled={!canSchedule}
                  onClick={openPublishPanel}
                  type="button"
                >
                  Đăng ngay
                </button>
                <button
                  className="flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-40"
                  disabled={!canSchedule}
                  onClick={openPublishPanel}
                  type="button"
                >
                  Lên lịch
                </button>
              </div>
            ) : null}
          </div>
        </div>

        <div className="flex md:hidden">
          <ViewModeToggle className="w-full" onChange={setViewMode} value={viewMode} />
        </div>
      </header>

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

      {savedDraft && !episode && !autosave.localRecovery ? (
        <p className="rounded-xl border border-sky-400/20 bg-sky-400/10 px-3 py-2 text-sm text-sky-100">
          Đã tải bản nháp autosave gần nhất.
        </p>
      ) : null}

      <form
        action={formAction}
        className="space-y-4"
        data-studio-chapter-form
        onSubmit={handleSubmit}
      >
        <input name="story_id" type="hidden" value={story.id} />
        <input name="return_base_path" type="hidden" value="/studio" />
        {episode ? <input name="episode_id" type="hidden" value={episode.id} /> : null}
        {autosave.draftId ? (
          <input name="studio_draft_id" type="hidden" value={autosave.draftId} />
        ) : null}
        <input name="content" type="hidden" value={content} />
        <input
          name="excerpt"
          type="hidden"
          value={authorNote.trim() || createExcerpt(content)}
        />

        {viewMode === "preview" ? (
          <EditorPreview
            authorNote={authorNote}
            chapterNumber={episodeNumber}
            content={content}
            storyTitle={story.title}
            title={title}
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-[7rem_minmax(0,1fr)]">
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
                label="Tiêu đề chương"
                name="title"
                onChange={(event) => handleFieldChange(setTitle, event.target.value)}
                placeholder="Tiêu đề chương"
                required
                value={title}
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <EditorToolbar
                disabled={pending}
                imageCount={imageCount}
                imageLimitReached={imageLimitReached}
                onFormat={handleFormat}
                onInsertImage={() => void handleOpenInsertImage()}
                onRedo={handleRedo}
                onUndo={handleUndo}
              />
              <button
                className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-40"
                disabled={pending}
                onClick={() => void handleOpenTemplatePicker()}
                type="button"
              >
                Chèn mẫu
              </button>
              <button
                className="inline-flex h-9 items-center rounded-lg border border-white/10 bg-zinc-950/80 px-3 text-xs font-semibold text-zinc-200 hover:bg-white/10 disabled:opacity-40"
                disabled={pending || !content.trim()}
                onClick={() => setSaveTemplateOpen(true)}
                type="button"
              >
                Lưu thành mẫu
              </button>
            </div>

            <EditorCanvas
              disabled={pending}
              onChange={handleContentChange}
              ref={canvasRef}
              value={content}
            />

            <SEOAssistantPanel
              chapterContext={{
                authorName: authorPenName,
                content,
                episodeNumber,
                genreName: story.genreName,
                storySlug: story.slug,
                storyTitle: story.title,
                tagNames: story.tagNames,
                title
              }}
              disabled={pending}
              episodeNumber={episodeNumber}
              isIndexable={chapterIndexable}
              keywords={seoKeywords}
              mode="chapter"
              onKeywordsChange={(value) => {
                setSeoKeywords(value);
                autosave.markDirty();
              }}
              onSeoDescriptionChange={(value) => {
                setSeoDescription(value);
                autosave.markDirty();
              }}
              onSeoTitleChange={(value) => {
                setSeoTitle(value);
                autosave.markDirty();
              }}
              seoDescription={seoDescription}
              seoTitle={seoTitle}
              storyContext={{
                authorName: authorPenName,
                genreName: story.genreName,
                tagNames: story.tagNames,
                title: story.title
              }}
              storySlug={story.slug}
            />

            <Textarea
              disabled={pending}
              label="Ghi chú tác giả"
              name="author_note_display"
              onChange={(event) =>
                handleFieldChange(setAuthorNote, event.target.value)
              }
              placeholder="Ghi chú hiển thị cho người đọc (tuỳ chọn)."
              rows={3}
              value={authorNote}
            />
          </>
        )}

        <p className="text-sm text-zinc-500">{statsLabel}</p>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="space-y-4">
            <GuidelinesAcknowledgementField
              acknowledged={acknowledged}
              disabled={pending}
              error={ackError}
              onAckChange={setAcknowledged}
              variant="episode"
            />

            <div className="flex flex-wrap gap-2">
              <Button
                className="md:hidden"
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
                variant="secondary"
              >
                Gửi duyệt
              </Button>
            </div>

            {state.error ? (
              <p className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-100">
                {state.error}
              </p>
            ) : null}
          </div>

          <VersionHistoryPanel
            draftId={autosave.draftId}
            onRestored={handleRestoreVersion}
          />
        </div>
      </form>

      <InsertImageDialog
        content={content}
        draftId={autosave.draftId}
        episodeId={episode?.id ?? null}
        onClose={() => setImageDialogOpen(false)}
        onInsert={(next) => handleContentChange(next)}
        open={imageDialogOpen}
        storyId={story.id}
        textareaRef={canvasRef}
      />

      <TemplatePicker
        content={content}
        defaultType="chapter"
        initialTemplateId={pendingTemplateId}
        onClose={() => {
          setTemplatePickerOpen(false);
          setPendingTemplateId(null);
        }}
        onInsert={(next) => handleContentChange(next)}
        open={templatePickerOpen}
        textareaRef={canvasRef}
      />

      <SaveAsTemplateDialog
        body={content}
        defaultTemplateType="chapter"
        onClose={() => setSaveTemplateOpen(false)}
        open={saveTemplateOpen}
      />

      {publishPanelOpen && canSchedule && episode ? (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4"
          role="dialog"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-white/10 bg-zinc-950 p-4 sm:rounded-2xl">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold text-white">Đăng hoặc lên lịch</h2>
              <button
                className="rounded-lg px-2 py-1 text-sm text-zinc-400 hover:bg-white/10"
                onClick={() => setPublishPanelOpen(false)}
                type="button"
              >
                Đóng
              </button>
            </div>

            <ChapterPublishChecklistPanel
              authorNote={authorNote}
              canPublish
              content={content}
              episodeId={episode.id}
              isSaved={!autosave.isDirty}
              seoDescription={seoDescription}
              storyId={story.id}
              storyInput={{
                status: story.status,
                title: story.title,
                visibility: story.visibility
              }}
              title={title}
            />

            <div className="mt-4">
              <SchedulePicker
                onScheduled={() => setPublishPanelOpen(false)}
                storyId={story.id}
                targetId={episode.id}
                targetType="chapter"
              />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ViewModeToggle({
  className = "",
  onChange,
  value
}: {
  className?: string;
  onChange: (mode: EditorViewMode) => void;
  value: EditorViewMode;
}) {
  return (
    <div
      className={`inline-flex rounded-xl border border-white/10 bg-white/5 p-1 ${className}`}
      role="tablist"
    >
      {(
        [
          { id: "write" as const, label: "Viết" },
          { id: "preview" as const, label: "Xem trước" }
        ] as const
      ).map((tab) => (
        <button
          aria-selected={value === tab.id}
          className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            value === tab.id
              ? "bg-sky-300 text-zinc-950"
              : "text-zinc-300 hover:bg-white/10"
          }`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          role="tab"
          type="button"
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
