"use client";

import { sanitizeDisplayText } from "@/lib/presentation/sanitize-display-text";
import type { ComposerBlockUnion } from "@/lib/composer/types";

type BranchingChoicesPreviewProps = {
  block: Extract<ComposerBlockUnion, { type: "choice_node" | "choice_option" }>;
};

export function BranchingChoicesPreview({ block }: BranchingChoicesPreviewProps) {
  if (block.type === "choice_node") {
    return (
      <div className="rounded-xl border border-fuchsia-400/25 bg-fuchsia-950/30 px-4 py-3">
        <p className="text-[0.65rem] font-bold uppercase tracking-wide text-fuchsia-300/90">
          Điểm lựa chọn
        </p>
        {block.data.title.trim() ? (
          <p className="mt-1 text-sm font-semibold text-white">
            {sanitizeDisplayText(block.data.title)}
          </p>
        ) : null}
        {block.data.content.trim() ? (
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
            {sanitizeDisplayText(block.data.content)}
          </p>
        ) : null}
        <p className="mt-2 text-xs text-zinc-500">
          Tương tác nhánh trên web đang được phát triển — hiện chỉ hiển thị nội dung tĩnh.
        </p>
      </div>
    );
  }

  return (
    <div className="ml-4 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <p className="text-sm text-zinc-200">
        <span className="text-fuchsia-300">▸</span>{" "}
        {sanitizeDisplayText(block.data.label) || "Lựa chọn"}
      </p>
      {block.data.target_node_id.trim() ? (
        <p className="mt-0.5 text-xs text-zinc-500">
          → {sanitizeDisplayText(block.data.target_node_id)}
        </p>
      ) : null}
    </div>
  );
}
