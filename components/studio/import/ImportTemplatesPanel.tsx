"use client";

import { useTransition } from "react";
import { Button } from "@/components/ui";
import {
  downloadStudioImportTemplatesAction,
  downloadStudioImportTemplatesXlsxAction,
  downloadStudioImportTemplatesZipAction
} from "@/lib/studio/import-export-actions";
import { STUDIO_IMPORT_INSTRUCTIONS } from "@/lib/studio/import-export-templates";

function downloadFile(name: string, content: string, mime = "text/plain;charset=utf-8") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function downloadZipBase64(fileName: string, zipBase64: string) {
  const binary = atob(zipBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportTemplatesPanel() {
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4 rounded-2xl border border-white/10 bg-[var(--surface)] p-5">
      <p className="text-sm text-zinc-400">
        Tải bộ CSV mẫu (stories + chapters + taxonomy_reference + hướng dẫn). Dùng{" "}
        <strong className="text-zinc-200">story_code</strong> khi cập nhật truyện đã export.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await downloadStudioImportTemplatesAction("create");
              if (result.error) return;
              for (const file of result.files) {
                downloadFile(file.name, file.content);
              }
            })
          }
          type="button"
        >
          Template tạo mới
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await downloadStudioImportTemplatesAction("update");
              if (result.error) return;
              for (const file of result.files) {
                downloadFile(file.name, file.content);
              }
            })
          }
          type="button"
          variant="secondary"
        >
          Template cập nhật
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await downloadStudioImportTemplatesZipAction("create");
              if (result.error || !result.zipBase64 || !result.fileName) return;
              downloadZipBase64(result.fileName, result.zipBase64);
            })
          }
          type="button"
          variant="secondary"
        >
          Tải ZIP gói mẫu
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await downloadStudioImportTemplatesXlsxAction("create");
              if (result.error || !result.xlsxBase64 || !result.fileName) return;
              const binary = atob(result.xlsxBase64);
              const bytes = new Uint8Array(binary.length);
              for (let i = 0; i < binary.length; i += 1) {
                bytes[i] = binary.charCodeAt(i);
              }
              const blob = new Blob([bytes], {
                type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = result.fileName;
              a.click();
              URL.revokeObjectURL(url);
            })
          }
          type="button"
          variant="secondary"
        >
          Tải XLSX mẫu
        </Button>
      </div>
      <pre className="max-h-64 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/60 p-4 text-xs leading-5 text-zinc-400 whitespace-pre-wrap">
        {STUDIO_IMPORT_INSTRUCTIONS}
      </pre>
    </div>
  );
}
