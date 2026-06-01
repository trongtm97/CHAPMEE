"use client";

import { AutosaveStatusBar } from "@/components/editor/AutosaveStatus";
import {
  formatEditorWordCount,
  formatReadTimeLabel
} from "@/lib/editor/count-words";
import type { AutosaveStatus } from "@/hooks/useAutosave";

type ChapterEditorStatsBarProps = {
  autosave: {
    errorMessage: string | null;
    lastSavedAt: string | null;
    status: AutosaveStatus;
  };
  characterCount: number;
  readTimeMinutes: number;
  wordCount: number;
};

export function ChapterEditorStatsBar({
  autosave,
  characterCount,
  readTimeMinutes,
  wordCount
}: ChapterEditorStatsBarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-zinc-400">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span>{formatEditorWordCount(wordCount)} từ</span>
        <span>{new Intl.NumberFormat("vi-VN").format(characterCount)} ký tự</span>
        <span>{formatReadTimeLabel(readTimeMinutes)}</span>
      </div>
      <AutosaveStatusBar
        errorMessage={autosave.errorMessage}
        lastSavedAt={autosave.lastSavedAt}
        status={autosave.status}
      />
    </div>
  );
}
