"use client";

import {
  GuidelinesAcknowledgementField
} from "@/components/creator/GuidelinesSubmitAcknowledgement";
import { VersionHistoryPanel } from "@/components/editor/VersionHistoryPanel";
import { ComposerPublishingCheck } from "@/components/composer/ComposerPublishingCheck";
import { ChapterPublishChecklistPanel } from "@/components/studio/ChapterPublishChecklistPanel";
import { Textarea } from "@/components/ui";
import { buildChapterUrlPreview } from "@/lib/chapters/chapter-url-preview";
import type { ComposerStructuredContent } from "@/lib/composer/types";
import type { StoryPublishInput } from "@/lib/publish/validate-story-before-publish";
import type { PresentationMode } from "@/types/presentation";
import type { StudioDraftVersionRecord } from "@/types/drafts";
import type { EditorViewMode } from "@/types/editor";

const AUTHOR_NOTE_MAX = 500;

type ChapterWritingSidebarProps = {
  acknowledged: boolean;
  ackError?: string | null;
  authorNote: string;
  canPublish: boolean;
  composerDocument?: ComposerStructuredContent | null;
  composerMode?: PresentationMode;
  content: string;
  disabled?: boolean;
  draftId: string | null;
  episodeId?: string | null;
  episodeNumber: number;
  knownComposerMediaIds?: string[];
  onAckChange: (value: boolean) => void;
  onAuthorNoteChange: (value: string) => void;
  onComposerWarningsAckChange?: (value: boolean) => void;
  onRestoreVersion: (version: StudioDraftVersionRecord) => void;
  onScrollToComposerBlock?: (blockId: string) => void;
  onViewPreview?: () => void;
  previewViewed?: boolean;
  seoDescription: string;
  storyContentWarningsConfirmed?: boolean;
  storyId: string;
  storyInput?: StoryPublishInput | null;
  storyPublicCode?: string | null;
  storySlug: string;
  title: string;
  useComposerUi?: boolean;
  isSaved?: boolean;
  viewMode?: EditorViewMode;
};

export function ChapterWritingSidebar({
  acknowledged,
  ackError,
  authorNote,
  canPublish,
  composerDocument,
  composerMode,
  content,
  disabled = false,
  draftId,
  episodeId,
  episodeNumber,
  knownComposerMediaIds = [],
  onAckChange,
  onAuthorNoteChange,
  onComposerWarningsAckChange,
  onRestoreVersion,
  onScrollToComposerBlock,
  onViewPreview,
  previewViewed = false,
  seoDescription,
  storyContentWarningsConfirmed = false,
  storyId,
  storyInput,
  storyPublicCode,
  storySlug,
  title,
  useComposerUi = false,
  isSaved = true,
  viewMode = "write"
}: ChapterWritingSidebarProps) {
  const urlPreview = buildChapterUrlPreview({
    episodeNumber,
    storyPublicCode,
    storySlug
  });

  return (
    <aside className="space-y-4 xl:sticky xl:top-24 xl:max-h-[calc(100vh-6.5rem)] xl:overflow-y-auto xl:pb-24">
      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Trạng thái chương
        </h3>
        <p className="mt-2 text-sm text-zinc-300">
          {episodeId ? "Đã lưu trên server" : "Chưa lưu — autosave cục bộ"}
        </p>
        <p className="mt-1 break-all text-xs text-zinc-500">{urlPreview}</p>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Checklist xuất bản
        </h3>
        <div className="mt-2">
          <ChapterPublishChecklistPanel
            authorNote={authorNote}
            canPublish={canPublish}
            content={content}
            episodeId={episodeId}
            isSaved={isSaved}
            seoDescription={seoDescription}
            storyId={storyId}
            storyInput={storyInput}
            title={title}
          />
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Xem trước nhanh
        </h3>
        <p className="mt-2 text-xs leading-5 text-zinc-500">
          {previewViewed
            ? "Bạn đã mở xem trước — nội dung hiển thị giống giao diện đọc."
            : "Mở xem trước để kiểm tra bố cục trên mobile/desktop."}
        </p>
        {onViewPreview ? (
          <button
            className="mt-3 w-full rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/15"
            onClick={onViewPreview}
            type="button"
          >
            Mở xem trước
          </button>
        ) : null}
      </section>

      {useComposerUi && composerDocument && composerMode ? (
        <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <ComposerPublishingCheck
            composerDocument={{ ...composerDocument, mode: composerMode }}
            contentWarningsConfirmed={storyContentWarningsConfirmed}
            disabled={disabled}
            knownMediaIds={knownComposerMediaIds}
            onAckWarningsChange={onComposerWarningsAckChange ?? (() => undefined)}
            onScrollToBlock={onScrollToComposerBlock}
            previewViewed={previewViewed || viewMode === "preview"}
            presentationMode={composerMode}
          />
        </section>
      ) : null}

      <details className="rounded-xl border border-white/10 bg-white/[0.02]">
        <summary className="cursor-pointer px-3 py-2.5 text-sm font-semibold text-zinc-300">
          Ghi chú cuối chương
        </summary>
        <div className="border-t border-white/10 p-3">
          <Textarea
            disabled={disabled}
            maxLength={AUTHOR_NOTE_MAX}
            name="author_note_display"
            onChange={(event) => onAuthorNoteChange(event.target.value.slice(0, AUTHOR_NOTE_MAX))}
            placeholder="Lời nhắn ngắn cho độc giả sau chương này..."
            rows={3}
            value={authorNote}
          />
          <p className="mt-1 text-right text-xs text-zinc-500">
            {authorNote.length}/{AUTHOR_NOTE_MAX}
          </p>
        </div>
      </details>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Lịch sử phiên bản
        </h3>
        <div className="mt-2">
          <VersionHistoryPanel draftId={draftId} onRestored={onRestoreVersion} />
        </div>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
        <GuidelinesAcknowledgementField
          acknowledged={acknowledged}
          disabled={disabled}
          error={ackError ?? null}
          onAckChange={onAckChange}
          variant="episode"
        />
      </section>
    </aside>
  );
}
