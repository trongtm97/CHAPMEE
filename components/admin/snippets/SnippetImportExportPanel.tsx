"use client";

import { useState, useTransition } from "react";
import { exportSnippetsAction, importSnippetsAction } from "@/lib/admin/snippet-actions";

type SnippetImportExportPanelProps = {
  selectedIds: string[];
};

export function SnippetImportExportPanel({ selectedIds }: SnippetImportExportPanelProps) {
  const [pending, startTransition] = useTransition();
  const [importJson, setImportJson] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
      <h2 className="text-sm font-semibold text-zinc-200">Nhập / Xuất JSON</h2>
      <p className="text-xs text-zinc-500">
        Import mặc định trạng thái bản nháp. Không kích hoạt tự động.
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          className="rounded-full border border-white/10 px-3 py-1.5 text-sm font-semibold text-zinc-200 hover:bg-white/5 disabled:opacity-50"
          disabled={pending || !selectedIds.length}
          onClick={() =>
            startTransition(async () => {
              const r = await exportSnippetsAction(selectedIds);
              if (!r.ok || !r.json) {
                setMessage(r.error ?? "Export thất bại");
                return;
              }
              const blob = new Blob([r.json], { type: "application/json" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `chapmee-snippets-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
              setMessage(`Đã xuất ${selectedIds.length} snippet.`);
            })
          }
          type="button"
        >
          Xuất đã chọn ({selectedIds.length})
        </button>
      </div>
      <textarea
        className="min-h-[120px] w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 font-mono text-xs text-zinc-100"
        onChange={(e) => setImportJson(e.target.value)}
        placeholder='{"version":1,"snippets":[...]}'
        value={importJson}
      />
      <button
        className="rounded-full bg-cyan-400/15 px-3 py-1.5 text-sm font-semibold text-cyan-100 hover:bg-cyan-400/25 disabled:opacity-50"
        disabled={pending || !importJson.trim()}
        onClick={() =>
          startTransition(async () => {
            const r = await importSnippetsAction(importJson);
            setMessage(
              r.ok
                ? `Import thành công: ${r.imported ?? 0} snippet (draft).`
                : (r.error ?? "Import thất bại")
            );
          })
        }
        type="button"
      >
        Import JSON
      </button>
      {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
    </div>
  );
}
