"use client";

import { useState } from "react";
import { BlockEditorShell } from "@/components/composer/BlockEditorShell";
import { BLOCK_TYPE_LABELS } from "@/lib/composer/blocks";
import { blockHasContent, getBlockSummary } from "@/lib/composer/block-summary";
import type { ComposerImageUploadContext } from "@/components/composer/editors/block-editors";
import type { ComposerBlockUnion, ComposerValidationIssue } from "@/lib/composer/types";
import { Button } from "@/components/ui";

type BlockListProps = {
  blocks: ComposerBlockUnion[];
  disabled?: boolean;
  imageUpload?: ComposerImageUploadContext;
  onChange: (blocks: ComposerBlockUnion[]) => void;
  onDuplicate: (index: number) => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  blockIssues?: Record<string, ComposerValidationIssue[]>;
};

export function BlockList({
  blocks,
  disabled,
  imageUpload,
  blockIssues = {},
  onChange,
  onDuplicate,
  onMove
}: BlockListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(
    blocks[0]?.id ?? null
  );

  const updateBlock = (index: number, block: ComposerBlockUnion) => {
    const next = [...blocks];
    next[index] = block;
    onChange(next);
  };

  const removeBlock = (index: number) => {
    const block = blocks[index];
    if (blockHasContent(block)) {
      const ok = window.confirm("Xóa block này? Nội dung sẽ mất.");
      if (!ok) {
        return;
      }
    }
    const next = blocks.filter((_, i) => i !== index);
    onChange(next);
    if (expandedId === block.id) {
      setExpandedId(next[0]?.id ?? null);
    }
  };

  if (blocks.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-zinc-500">
        Chưa có block. Bấm &quot;+ Thêm block&quot; để bắt đầu hoặc &quot;Chèn mẫu&quot;.
      </p>
    );
  }

  return (
    <ul className="space-y-2" data-composer-block-list>
      {blocks.map((block, index) => {
        const expanded = expandedId === block.id;
        const issues = blockIssues[block.id] ?? [];
        const hasError = issues.some((issue) => issue.severity === "error");
        const hasWarning = issues.some((issue) => issue.severity === "warning");
        return (
          <li
            className={`rounded-xl border bg-white/[0.02] ${
              hasError
                ? "border-rose-400/40"
                : hasWarning
                  ? "border-amber-400/30"
                  : "border-white/10"
            }`}
            id={`composer-block-${block.id}`}
            key={block.id}
          >
            <div className="flex flex-wrap items-start gap-2 p-3">
              <button
                className="min-w-0 flex-1 text-left"
                disabled={disabled}
                onClick={() => setExpandedId(expanded ? null : block.id)}
                type="button"
              >
                <span className="text-[0.65rem] font-bold uppercase tracking-wide text-zinc-500">
                  #{block.order} · {BLOCK_TYPE_LABELS[block.type]}
                </span>
                <span className="mt-1 block line-clamp-2 text-sm text-zinc-200">
                  {getBlockSummary(block)}
                </span>
                {issues[0] ? (
                  <span
                    className={`mt-1 block text-xs ${
                      hasError ? "text-rose-300" : "text-amber-200"
                    }`}
                  >
                    {issues[0].message}
                  </span>
                ) : null}
              </button>
              <div className="flex flex-wrap gap-1">
                <Button
                  disabled={disabled || index === 0}
                  onClick={() => onMove(index, index - 1)}
                  type="button"
                  variant="ghost"
                >
                  ↑
                </Button>
                <Button
                  disabled={disabled || index >= blocks.length - 1}
                  onClick={() => onMove(index, index + 1)}
                  type="button"
                  variant="ghost"
                >
                  ↓
                </Button>
                <Button
                  disabled={disabled}
                  onClick={() => onDuplicate(index)}
                  type="button"
                  variant="ghost"
                >
                  Nhân bản
                </Button>
                <Button
                  disabled={disabled}
                  onClick={() => removeBlock(index)}
                  type="button"
                  variant="ghost"
                >
                  Xóa
                </Button>
              </div>
            </div>
            {expanded ? (
              <div className="border-t border-white/10 p-3">
                <BlockEditorShell
                  block={block}
                  disabled={disabled}
                  imageUpload={imageUpload}
                  onChange={(next) => updateBlock(index, next)}
                />
              </div>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
