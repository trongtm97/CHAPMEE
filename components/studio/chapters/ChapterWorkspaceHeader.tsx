"use client";

import Link from "next/link";
import { AutosaveStatusBar } from "@/components/editor/AutosaveStatus";
import { Button } from "@/components/ui";
import { StudioStatusBadge } from "@/components/studio/StudioStatusBadge";
import type { StudioDisplayStatus } from "@/types/studio";
import type { AutosaveStatus } from "@/hooks/useAutosave";
import type { EditorViewMode } from "@/types/editor";

type ChapterWorkspaceHeaderProps = {
  backHref: string;
  storyTitle: string;
  pageTitle: string;
  displayStatus: StudioDisplayStatus;
  autosave: {
    errorMessage: string | null;
    lastSavedAt: string | null;
    status: AutosaveStatus;
    isDirty: boolean;
  };
  viewMode: EditorViewMode;
  onViewModeChange: (mode: EditorViewMode) => void;
  onSaveDraft: () => void;
  onSchedule: () => void;
  onPublish: () => void;
  canSchedule: boolean;
  scheduleDisabledReason?: string;
  publishDisabledReason?: string;
  pending?: boolean;
  submitError?: string | null;
  isNewChapter?: boolean;
  newChapterHref?: string | null;
};

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
              ? "bg-cyan-400 text-zinc-950"
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

export function ChapterWorkspaceHeader({
  autosave,
  backHref,
  canSchedule,
  displayStatus,
  onPublish,
  onSaveDraft,
  onSchedule,
  onViewModeChange,
  pageTitle,
  pending = false,
  publishDisabledReason,
  scheduleDisabledReason,
  storyTitle,
  submitError = null,
  isNewChapter = false,
  newChapterHref = null,
  viewMode
}: ChapterWorkspaceHeaderProps) {
  const publishLabel =
    displayStatus === "published"
      ? "Cập nhật"
      : isNewChapter
        ? "Đăng chương mới"
        : "Đăng ngay";
  const statusBadge =
    autosave.status === "saving" ? (
      <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-2 py-0.5 text-xs font-semibold text-cyan-200">
        Đang autosave
      </span>
    ) : autosave.isDirty ? (
      <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-100">
        Chưa lưu
      </span>
    ) : autosave.status === "error" ? (
      <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2 py-0.5 text-xs font-semibold text-rose-100">
        Có lỗi
      </span>
    ) : autosave.lastSavedAt ? (
      <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-100">
        Đã lưu
      </span>
    ) : (
      <span className="rounded-full border border-zinc-600/40 bg-zinc-800/60 px-2 py-0.5 text-xs font-semibold text-zinc-300">
        Nháp
      </span>
    );

  return (
    <>
      <header className="sticky top-0 z-20 -mx-1 border-b border-white/10 bg-[#070b12]/95 px-1 py-3 backdrop-blur-md">
        <div className="flex min-w-0 items-start gap-2 sm:gap-3">
          <Link
            aria-label="Quay lại danh sách chương"
            className="inline-flex h-9 shrink-0 items-center rounded-lg border border-white/10 px-2.5 text-sm font-semibold text-zinc-300 hover:bg-white/5"
            href={backHref}
          >
            ←
          </Link>

          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-zinc-500">
              Truyện:{" "}
              <span className="text-zinc-400" title={storyTitle}>
                {storyTitle}
              </span>
            </p>
            <h1 className="line-clamp-1 text-base font-bold text-white sm:text-lg">
              {pageTitle}
            </h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <StudioStatusBadge kind="chapter" status={displayStatus} />
              {statusBadge}
              <AutosaveStatusBar
                errorMessage={autosave.errorMessage}
                lastSavedAt={autosave.lastSavedAt}
                status={autosave.status}
              />
            </div>
          </div>

          <div className="hidden shrink-0 items-center gap-2 lg:flex">
            <ViewModeToggle onChange={onViewModeChange} value={viewMode} />
            {newChapterHref ? (
              <Link
                className="inline-flex h-9 items-center rounded-lg border border-white/10 px-3 text-sm font-semibold text-zinc-300 hover:bg-white/5"
                href={newChapterHref}
              >
                + Chương mới
              </Link>
            ) : null}
            <Button
              loading={pending}
              onClick={onSaveDraft}
              type="button"
              variant="secondary"
            >
              Lưu nháp
            </Button>
            <Button
              disabled={!canSchedule}
              onClick={onSchedule}
              title={scheduleDisabledReason}
              type="button"
              variant="secondary"
            >
              Lên lịch
            </Button>
            <Button
              disabled={!canSchedule}
              onClick={onPublish}
              title={publishDisabledReason}
              type="button"
            >
              {publishLabel}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-col gap-2 lg:hidden">
          {newChapterHref ? (
            <Link
              className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-white/10 text-sm font-semibold text-zinc-300 hover:bg-white/5"
              href={newChapterHref}
            >
              + Chương mới
            </Link>
          ) : null}
          <ViewModeToggle className="w-full" onChange={onViewModeChange} value={viewMode} />
        </div>
      </header>

      {submitError ? (
        <p
          className="rounded-xl border border-red-400/30 bg-red-400/10 px-3 py-2 text-sm text-red-100"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-white/10 bg-[#070b12]/98 p-2 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-lg items-center gap-2">
          <Button
            className="flex-1"
            loading={pending}
            onClick={onSaveDraft}
            type="button"
            variant="secondary"
          >
            Lưu
          </Button>
          <Button
            className="flex-1"
            disabled={!canSchedule}
            onClick={onSchedule}
            title={scheduleDisabledReason}
            type="button"
            variant="secondary"
          >
            Lên lịch
          </Button>
          <Button
            className="flex-[1.2]"
            disabled={!canSchedule}
            onClick={onPublish}
            title={publishDisabledReason}
            type="button"
          >
            {publishLabel}
          </Button>
        </div>
      </div>
    </>
  );
}
