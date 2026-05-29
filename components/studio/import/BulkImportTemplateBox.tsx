"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import {
  BULK_IMPORT_EXAMPLE,
  BULK_IMPORT_TEMPLATE_DOWNLOAD_PATH,
  BULK_IMPORT_TEMPLATE_SAMPLE
} from "@/lib/import/bulk-import-template";

type BulkImportTemplateBoxProps = {
  onCopyApplied?: () => void;
};

export function BulkImportTemplateBox({ onCopyApplied }: BulkImportTemplateBoxProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(BULK_IMPORT_TEMPLATE_SAMPLE);
    setCopied(true);
    onCopyApplied?.();
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
      <div>
        <h2 className="text-lg font-semibold text-white">Hướng dẫn dùng template</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-zinc-400">
          <li>Copy mẫu bên dưới.</li>
          <li>Thay số chương, tiêu đề và nội dung bằng truyện của bạn.</li>
          <li>Mỗi chương bắt đầu bằng dòng === CHƯƠNG SỐ ===.</li>
          <li>Không xóa dòng “Tiêu đề:” và “Nội dung:”.</li>
          <li>Bấm “Xem trước” để kiểm tra trước khi nhập.</li>
          <li>Sau khi nhập, các chương sẽ nằm ở trạng thái nháp.</li>
        </ol>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button onClick={handleCopy} type="button" variant="secondary">
          {copied ? "Đã copy" : "Copy template mẫu"}
        </Button>
        <a
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-bold uppercase tracking-[0.12em] text-zinc-100 transition hover:border-white/20"
          download="chapmee-bulk-import-template.txt"
          href={BULK_IMPORT_TEMPLATE_DOWNLOAD_PATH}
        >
          Tải template .txt
        </a>
      </div>

      <details className="rounded-xl border border-white/10 bg-zinc-950/60">
        <summary className="cursor-pointer px-4 py-3 text-sm font-semibold text-cyan-200">
          Xem ví dụ đầy đủ
        </summary>
        <pre className="max-h-64 overflow-auto whitespace-pre-wrap px-4 pb-4 text-xs leading-relaxed text-zinc-300">
          {BULK_IMPORT_EXAMPLE}
        </pre>
      </details>

      <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-white/10 bg-zinc-950/80 p-4 text-xs leading-relaxed text-zinc-400">
        {BULK_IMPORT_TEMPLATE_SAMPLE}
      </pre>
    </div>
  );
}
