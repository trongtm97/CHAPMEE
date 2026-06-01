"use client";

import { useTransition } from "react";
import { getTemplateBody } from "@/lib/studio/template-content";
import { duplicateTemplateAction } from "@/lib/studio/template-actions";
import { STUDIO_TEMPLATE_TYPE_LABELS } from "@/lib/studio/template-labels";
import {
  tplBtnCompact,
  tplBtnCompactPrimary,
  tplBtnSecondary
} from "@/components/studio/templates/shared/styles";
import type { StudioTemplateRecord } from "@/types/templates";

const USE_HINTS: Record<string, string> = {
  author_note: "Cuối chương hoặc ghi chú tác giả",
  chapter: "Nội dung chương truyện",
  community_post: "Bài đăng cộng đồng",
  reels: "Hook Reels và CTA ngắn",
  seo: "Mô tả SEO / tìm kiếm",
  story_description: "Trang mô tả truyện"
};

type TemplatePreviewPanelProps = {
  onClose: () => void;
  onCopy: (body: string) => void;
  onDuplicateSuccess: () => void;
  onUse: () => void;
  template: StudioTemplateRecord;
};

export function TemplatePreviewPanel({
  onClose,
  onCopy,
  onDuplicateSuccess,
  onUse,
  template
}: TemplatePreviewPanelProps) {
  const body = getTemplateBody(template.content);
  const [isPending, startTransition] = useTransition();

  function handleDuplicate() {
    startTransition(async () => {
      const result = await duplicateTemplateAction(template.id);

      if (!result.ok) {
        window.alert(result.error ?? "Không nhân bản được.");
        return;
      }

      onDuplicateSuccess();
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-3">
        <div>
          <p className="text-xs text-zinc-500">
            {template.isSystem ? "Mẫu của ChapMee" : "Mẫu của tôi"} ·{" "}
            {STUDIO_TEMPLATE_TYPE_LABELS[template.templateType]}
          </p>
          <h2 className="text-lg font-bold text-white">{template.title}</h2>
        </div>
        <button
          className="min-h-10 text-sm text-zinc-400 hover:text-white"
          onClick={onClose}
          type="button"
        >
          Đóng
        </button>
      </div>

      {template.description ? (
        <p className="mt-3 text-sm text-zinc-400">{template.description}</p>
      ) : null}

      <p className="mt-3 rounded-lg border border-cyan-400/20 bg-cyan-400/5 px-3 py-2 text-xs text-cyan-100/90">
        Gợi ý: {USE_HINTS[template.templateType] ?? "Chèn vào nội dung phù hợp"}
      </p>

      <pre className="mt-3 max-h-[40vh] flex-1 overflow-y-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-7 text-zinc-200 lg:max-h-none">
        {body}
      </pre>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button className={tplBtnCompactPrimary} onClick={onUse} type="button">
          Dùng mẫu
        </button>
        <button className={tplBtnCompact} onClick={() => onCopy(body)} type="button">
          Sao chép nội dung
        </button>
        <button
          className={tplBtnCompact}
          disabled={isPending}
          onClick={handleDuplicate}
          type="button"
        >
          Nhân bản thành mẫu của tôi
        </button>
        <button className={tplBtnSecondary} onClick={onClose} type="button">
          Đóng
        </button>
      </div>
    </div>
  );
}
