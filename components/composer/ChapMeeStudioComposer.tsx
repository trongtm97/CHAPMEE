"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { AddBlockButton } from "@/components/composer/AddBlockMenu";
import { BlockList } from "@/components/composer/BlockList";
import { ComposerMobilePreview } from "@/components/composer/ComposerMobilePreview";
import { createBlock, duplicateBlock } from "@/lib/composer/blocks";
import { COMPOSER_MODE_LABELS } from "@/lib/composer/modes";
import { getDefaultTemplateForMode } from "@/lib/composer/templates";
import { moveBlock, normalizeBlockOrder } from "@/lib/composer/serializer";
import { validateComposerDocument } from "@/lib/composer/validators";
import type {
  ComposerBlockType,
  ComposerMode,
  ComposerStructuredContent,
  ComposerValidationResult
} from "@/lib/composer/types";
import { Button } from "@/components/ui";
import { ReaderPreferencesProvider } from "@/components/reader/ReaderPreferencesProvider";
import { ChapMeeBlockRenderer } from "@/components/composer/renderers/ChapMeeBlockRenderer";
import { collectMediaIdsFromBlocks } from "@/lib/composer/collect-media-ids";
import { useChapterImagesMap } from "@/hooks/useChapterImagesMap";
import { isAbortError, useLatestRequestGuard } from "@/hooks/useLatestRequestGuard";

export type ChapMeeStudioComposerProps = {
  mode: ComposerMode;
  value: ComposerStructuredContent;
  fallbackContent: string;
  onChange: (value: ComposerStructuredContent) => void;
  onSaveDraft?: () => void;
  onValidate?: (result: ComposerValidationResult) => void;
  readonly?: boolean;
  saveStatusLabel?: string | null;
  imageUpload?: import("@/components/composer/editors/block-editors").ComposerImageUploadContext;
};

export function ChapMeeStudioComposer({
  fallbackContent,
  mode,
  onChange,
  onSaveDraft,
  onValidate,
  readonly = false,
  saveStatusLabel = null,
  imageUpload,
  value
}: ChapMeeStudioComposerProps) {
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [desktopPreviewOpen, setDesktopPreviewOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [validationMessage, setValidationMessage] = useState<string | null>(null);
  const [modeWarning, setModeWarning] = useState<string | null>(null);

  const blocks = value.blocks;
  const deferredValue = useDeferredValue(value);
  const shouldLoadPreview = desktopPreviewOpen || mobilePreviewOpen;
  const previewMediaIds = useMemo(
    () => (shouldLoadPreview ? collectMediaIdsFromBlocks(deferredValue.blocks) : []),
    [deferredValue.blocks, shouldLoadPreview]
  );
  const { imageMap: previewImageMap } = useChapterImagesMap(previewMediaIds);
  const requestGuard = useLatestRequestGuard();

  useEffect(() => {
    const requestId = requestGuard.nextRequestId();
    const controller = new AbortController();
    async function load() {
      try {
        const res = await fetch("/api/composer/settings", {
          cache: "no-store",
          signal: controller.signal
        });
        if (!res.ok) return;
        const data = (await res.json()) as {
          modes?: Array<{
            mode: ComposerMode;
            is_active: boolean;
            is_creator_selectable: boolean;
          }>;
        };
        const modeRow = data.modes?.find((item) => item.mode === mode);
        if (!requestGuard.onlyLatest(requestId) || !modeRow) return;
        if (!modeRow.is_active || !modeRow.is_creator_selectable) {
          setModeWarning("Mode này đã bị tắt cho nội dung mới. Bạn vẫn có thể chỉnh sửa nội dung hiện có.");
        } else {
          setModeWarning(null);
        }
      } catch (error) {
        if (isAbortError(error) || !requestGuard.onlyLatest(requestId)) {
          return;
        }
        setModeWarning(null);
      }
    }
    void load();
    return () => {
      controller.abort();
    };
  }, [mode, requestGuard]);

  const syncBlocks = useCallback(
    (nextBlocks: typeof blocks) => {
      onChange({
        ...value,
        mode,
        blocks: normalizeBlockOrder(nextBlocks)
      });
    },
    [mode, onChange, value]
  );

  const handleAddBlock = useCallback(
    (blockType: ComposerBlockType) => {
      const block = createBlock(blockType);
      const next = [...blocks];
      next.push(block);
      syncBlocks(next);
    },
    [blocks, syncBlocks]
  );

  const handleInsertTemplate = useCallback(() => {
    const template = getDefaultTemplateForMode(mode);
    const isEmpty = blocks.length === 0;

    if (isEmpty) {
      onChange({ ...template, mode });
      return;
    }

    const append = window.confirm(
      "Thêm mẫu vào cuối nội dung hiện tại?\n\nBấm Hủy nếu muốn thay thế toàn bộ thay vì thêm."
    );
    if (append) {
      onChange({
        ...value,
        mode,
        blocks: normalizeBlockOrder([...blocks, ...template.blocks])
      });
      return;
    }
    if (!window.confirm("Thay thế toàn bộ nội dung hiện tại bằng mẫu?")) {
      return;
    }
    onChange({ ...template, mode });
  }, [blocks, mode, onChange, value]);

  const blockIssues = useMemo(() => {
    const result = validateComposerDocument({ ...value, mode });
    const map: Record<string, import("@/lib/composer/types").ComposerValidationIssue[]> =
      {};
    for (const issue of [...result.errors, ...result.warnings]) {
      if (!issue.blockId) {
        continue;
      }
      if (!map[issue.blockId]) {
        map[issue.blockId] = [];
      }
      map[issue.blockId].push(issue);
    }
    return map;
  }, [mode, value]);

  const handleValidate = useCallback(() => {
    const result = validateComposerDocument({ ...value, mode });
    onValidate?.(result);
    if (!result.ok) {
      setValidationMessage(result.errors[0]?.message ?? "Có lỗi cần sửa.");
    } else if (result.warnings.length > 0) {
      setValidationMessage(
        `Hợp lệ · ${result.warnings.length} cảnh báo: ${result.warnings[0]?.message ?? ""}`
      );
    } else {
      setValidationMessage("Nội dung hợp lệ — sẵn sàng lưu.");
    }
  }, [mode, onValidate, value]);

  const desktopPreview = useMemo(
    () => (
      <div className="rounded-xl border border-white/10 bg-[#0b1018] p-4">
        <p className="mb-3 text-xs font-bold uppercase tracking-wide text-zinc-500">
          Xem trước
        </p>
        <ReaderPreferencesProvider>
          <ChapMeeBlockRenderer
            chapterImageMap={previewImageMap}
            contentFormat="structured_blocks"
            context="preview"
            fallbackContent={fallbackContent}
            mode={mode}
            showFallbackNotice
            structuredContent={deferredValue}
          />
        </ReaderPreferencesProvider>
      </div>
    ),
    [deferredValue, fallbackContent, mode, previewImageMap]
  );

  return (
    <div className="space-y-4 rounded-2xl border border-cyan-400/20 bg-cyan-950/10 p-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-base font-bold text-cyan-100">ChapMee Studio Composer</h2>
          <p className="mt-1 text-xs text-zinc-400">
            {COMPOSER_MODE_LABELS[mode]} · {blocks.length} block
            {saveStatusLabel ? ` · ${saveStatusLabel}` : null}
          </p>
          {validationMessage ? (
            <p className="mt-2 text-xs text-amber-200">{validationMessage}</p>
          ) : null}
          {modeWarning ? <p className="mt-2 text-xs text-amber-300">{modeWarning}</p> : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {!readonly ? (
            <>
              <Button onClick={handleInsertTemplate} type="button" variant="secondary">
                Chèn mẫu
              </Button>
              <Button onClick={handleValidate} type="button" variant="secondary">
                Kiểm tra
              </Button>
              {onSaveDraft ? (
                <Button onClick={onSaveDraft} type="button" variant="secondary">
                  Lưu nháp
                </Button>
              ) : null}
            </>
          ) : null}
          <Button
            onClick={() => setMobilePreviewOpen(true)}
            type="button"
            variant="secondary"
          >
            Xem trước mobile
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-3">
          {!readonly ? <AddBlockButton mode={mode} onSelect={handleAddBlock} /> : null}
          <BlockList
            blockIssues={blockIssues}
            blocks={blocks}
            disabled={readonly}
            imageUpload={imageUpload}
            onChange={syncBlocks}
            onDuplicate={(index) => {
              const copy = duplicateBlock(blocks[index]);
              const next = [...blocks];
              next.splice(index + 1, 0, copy);
              syncBlocks(next);
            }}
            onMove={(from, to) => syncBlocks(moveBlock(blocks, from, to))}
          />
        </div>

        <aside className="hidden space-y-3 lg:block">
          {desktopPreviewOpen ? (
            desktopPreview
          ) : (
            <div className="rounded-xl border border-white/10 bg-[#0b1018] p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                Xem truoc
              </p>
              <Button
                className="mt-3"
                onClick={() => setDesktopPreviewOpen(true)}
                type="button"
                variant="secondary"
              >
                Mo preview
              </Button>
            </div>
          )}
          <button
            className="text-xs font-semibold text-sky-300 hover:text-sky-200"
            onClick={() => setHelpOpen((o) => !o)}
            type="button"
          >
            {helpOpen ? "Ẩn hướng dẫn" : "Hướng dẫn format"}
          </button>
          {helpOpen ? (
            <p className="text-xs leading-relaxed text-zinc-500">
              Soạn từng block theo định dạng truyện. Dùng nút lên/xuống để sắp xếp. Ảnh chỉ qua
              media_id nội bộ. Nội dung văn xuôi trong cột content vẫn được giữ làm bản dự phòng khi
              lưu.
            </p>
          ) : null}
        </aside>
      </div>

      <div className="flex gap-2 lg:hidden">
        {!readonly ? (
          <AddBlockButton mode={mode} onSelect={handleAddBlock} />
        ) : null}
      </div>

      {!readonly && onSaveDraft ? (
        <div className="fixed inset-x-0 bottom-0 z-40 flex gap-2 border-t border-white/10 bg-zinc-950/95 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
          <div className="flex-1">
            <AddBlockButton mode={mode} onSelect={handleAddBlock} />
          </div>
          <Button
            className="flex-1"
            onClick={() => setMobilePreviewOpen(true)}
            type="button"
            variant="secondary"
          >
            Xem trước
          </Button>
          <Button className="flex-1" onClick={onSaveDraft} type="button">
            Lưu nháp
          </Button>
        </div>
      ) : null}

      <ComposerMobilePreview
        fallbackContent={fallbackContent}
        mode={mode}
        onClose={() => setMobilePreviewOpen(false)}
        open={mobilePreviewOpen}
        value={value}
      />
    </div>
  );
}
