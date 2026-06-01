"use client";

import { useMemo, useState } from "react";
import { ChapterPresentationRenderer } from "@/components/presentation/ChapterPresentationRenderer";
import { ReaderPreferencesProvider } from "@/components/reader/ReaderPreferencesProvider";
import { StructuredModeEditor } from "@/components/studio/presentation/StructuredModeEditor";
import { Button } from "@/components/ui";
import {
  modeUsesStructuredContent,
  PRESENTATION_MODE_LABELS
} from "@/lib/presentation/constants";
import { validateStructuredContentForImport } from "@/lib/presentation/parse-structured";
import { stringifyStructuredTemplate } from "@/lib/presentation/template-json";
import type { PresentationMode } from "@/types/presentation";

export type PresentationEditorMode = "plain" | "structured";

type ChapterPresentationPanelProps = {
  storyPresentationMode: PresentationMode;
  structuredJson: string;
  onStructuredJsonChange: (value: string) => void;
  editorMode: PresentationEditorMode;
  onEditorModeChange: (mode: PresentationEditorMode) => void;
  plainContent: string;
  templateExampleJson?: string | null;
  disabled?: boolean;
};

export function ChapterPresentationPanel({
  disabled = false,
  editorMode,
  onEditorModeChange,
  onStructuredJsonChange,
  plainContent,
  storyPresentationMode,
  structuredJson,
  templateExampleJson = null
}: ChapterPresentationPanelProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const usesStructured = modeUsesStructuredContent(storyPresentationMode);

  const structuredValidation = useMemo(() => {
    if (!usesStructured || editorMode !== "structured" || !structuredJson.trim()) {
      return null;
    }

    const result = validateStructuredContentForImport(
      storyPresentationMode,
      structuredJson
    );
    return result.ok ? null : result.error;
  }, [editorMode, storyPresentationMode, structuredJson, usesStructured]);

  if (!usesStructured) {
    return null;
  }

  const handleSwitchToPlain = () => {
    if (
      editorMode === "structured" &&
      structuredJson.trim() &&
      !window.confirm(
        "Chuyển về văn xuôi có thể bỏ qua nội dung cấu trúc khi lưu. Tiếp tục?"
      )
    ) {
      return;
    }
    onEditorModeChange("plain");
  };

  const handleInsertTemplate = () => {
    if (templateExampleJson?.trim()) {
      onStructuredJsonChange(templateExampleJson);
    } else {
      onStructuredJsonChange(
        stringifyStructuredTemplate(storyPresentationMode, null)
      );
    }
    onEditorModeChange("structured");
  };

  let structuredPreview: unknown = null;
  try {
    structuredPreview = structuredJson.trim() ? JSON.parse(structuredJson) : null;
  } catch {
    structuredPreview = null;
  }

  return (
    <div className="space-y-3 rounded-xl border border-cyan-400/20 bg-cyan-950/20 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-cyan-100">
            Định dạng truyện: {PRESENTATION_MODE_LABELS[storyPresentationMode]}
          </p>
          <p className="mt-1 text-xs text-zinc-400">
            Soạn văn xuôi thường hoặc nội dung cấu trúc theo định dạng đã chọn ở form truyện.
            {templateExampleJson
              ? " Chèn mẫu sẽ ưu tiên mẫu format đã gắn với truyện."
              : null}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={disabled}
            onClick={handleInsertTemplate}
            type="button"
            variant="secondary"
          >
            Chèn mẫu
          </Button>
          <Button
            disabled={disabled}
            onClick={() => setPreviewOpen((open) => !open)}
            type="button"
            variant="secondary"
          >
            {previewOpen ? "Ẩn preview" : "Preview"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            editorMode === "plain"
              ? "bg-white/15 text-white"
              : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
          disabled={disabled}
          onClick={() => onEditorModeChange("plain")}
          type="button"
        >
          Văn xuôi
        </button>
        <button
          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
            editorMode === "structured"
              ? "bg-white/15 text-white"
              : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
          }`}
          disabled={disabled}
          onClick={() => onEditorModeChange("structured")}
          type="button"
        >
          Cấu trúc
        </button>
        {editorMode === "structured" ? (
          <button
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-500/10"
            disabled={disabled}
            onClick={handleSwitchToPlain}
            type="button"
          >
            Chuyển về văn xuôi
          </button>
        ) : null}
      </div>

      {editorMode === "structured" ? (
        <>
          {structuredValidation ? (
            <p className="rounded-lg border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
              {structuredValidation}
            </p>
          ) : structuredJson.trim() ? (
            <p className="text-xs text-emerald-300/90">Nội dung cấu trúc hợp lệ.</p>
          ) : null}
          <StructuredModeEditor
            disabled={disabled}
            mode={storyPresentationMode}
            onChange={onStructuredJsonChange}
            valueJson={structuredJson}
          />
        </>
      ) : null}

      {previewOpen ? (
        <div className="rounded-xl border border-white/10 bg-[#0b1018] p-4">
          <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
            Xem trước đọc chương
          </p>
          <ReaderPreferencesProvider>
            <ChapterPresentationRenderer
              chapterMode={null}
              content={plainContent}
              mode={storyPresentationMode}
              showFallbackNotice
              storyMode={storyPresentationMode}
              structuredContent={
                editorMode === "structured" ? structuredPreview : null
              }
            />
          </ReaderPreferencesProvider>
        </div>
      ) : null}
    </div>
  );
}
