"use client";

import Link from "next/link";
import { studioPath } from "@/lib/studio/constants";
import { setPendingTemplateInsert } from "@/lib/studio/pending-template";
import {
  tplBtnCompactPrimary,
  tplBtnSecondary
} from "@/components/studio/templates/shared/styles";
import type { StudioTemplateListItem } from "@/types/templates";

type TemplateUseModalProps = {
  body: string;
  onClose: () => void;
  onCopied: () => void;
  template: StudioTemplateListItem;
};

export function TemplateUseModal({
  body,
  onClose,
  onCopied,
  template
}: TemplateUseModalProps) {
  async function copyContent() {
    try {
      await navigator.clipboard.writeText(body);
      onCopied();
    } catch {
      window.alert("Không sao chép được. Hãy sao chép thủ công từ phần xem trước.");
    }
  }

  function useFor(target: "reels" | "chapter" | "story") {
    setPendingTemplateInsert(template.id);

    if (target === "reels") {
      window.location.href = studioPath("/reels/new");
      return;
    }

    if (target === "story") {
      window.location.href = studioPath("/stories");
      return;
    }

    window.location.href = studioPath("/stories");
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center sm:p-4"
      role="dialog"
    >
      <div className="w-full max-w-md rounded-t-2xl border border-white/10 bg-zinc-950 p-4 sm:rounded-2xl">
        <h2 className="text-lg font-bold text-white">Dùng mẫu</h2>
        <p className="mt-1 text-sm text-zinc-400">{template.title}</p>

        <div className="mt-4 grid gap-2">
          <button
            className={tplBtnCompactPrimary}
            onClick={() => useFor("reels")}
            type="button"
          >
            Dùng cho Reels
          </button>
          <button
            className={tplBtnSecondary}
            onClick={() => useFor("chapter")}
            type="button"
          >
            Dùng cho chương
          </button>
          <button
            className={tplBtnSecondary}
            onClick={() => useFor("story")}
            type="button"
          >
            Dùng cho mô tả truyện
          </button>
          <button className={tplBtnSecondary} onClick={copyContent} type="button">
            Sao chép vào clipboard
          </button>
        </div>

        <button
          className="mt-4 w-full text-sm text-zinc-500 hover:text-zinc-300"
          onClick={onClose}
          type="button"
        >
          Đóng
        </button>

        <p className="mt-3 text-center text-xs text-zinc-600">
          Hoặc mở{" "}
          <Link className="text-cyan-300" href={studioPath("/stories")}>
            trình soạn chương
          </Link>
        </p>
      </div>
    </div>
  );
}
