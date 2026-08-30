"use client";

import { Input } from "@/components/ui";
import type { ImportChapterPreview } from "@/types/import";

const STATUS_LABELS: Record<string, string> = {
  content_short: "Nội dung ngắn — vẫn nhập",
  duplicate_in_file: "Trùng — bỏ qua",
  duplicate_in_story: "Đã có — bỏ qua",
  missing_content: "Chưa có nội dung — nhập nháp",
  title_too_long: "Tiêu đề sẽ được cắt",
  valid: "Sẽ nhập"
};

const BLOCKING_STATUSES = new Set(["duplicate_in_file", "duplicate_in_story"]);

type BulkImportPreviewProps = {
  previews: ImportChapterPreview[];
  onChange: (previews: ImportChapterPreview[]) => void;
};

export function BulkImportPreview({ onChange, previews }: BulkImportPreviewProps) {
  function updateItem(id: string, patch: Partial<ImportChapterPreview>) {
    onChange(
      previews.map((item) => (item.id === id ? { ...item, ...patch } : item))
    );
  }

  const selectedCount = previews.filter((item) => item.selected).length;
  const importableCount = previews.filter(
    (item) => item.selected && !BLOCKING_STATUSES.has(item.status)
  ).length;
  const skippedCount = previews.filter(
    (item) => BLOCKING_STATUSES.has(item.status)
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">
          Xem trước ({previews.length} chương)
        </h2>
        <p className="text-sm text-zinc-500">
          Sẽ nhập {importableCount} · Đã chọn {selectedCount} · Bỏ qua {skippedCount}
        </p>
      </div>

      <p className="text-sm text-zinc-400">
        Chương trùng số hoặc đã tồn tại sẽ bị bỏ qua. Tiêu đề quá dài được cắt tự động.
        Chương thiếu nội dung vẫn nhập vào nháp để bạn viết tiếp.
      </p>

      <div className="space-y-3">
        {previews.map((item) => {
          const blocked = BLOCKING_STATUSES.has(item.status);

          return (
            <article
              className={`rounded-2xl border p-4 ${
                blocked ? "border-zinc-600/40 bg-zinc-900/40" : "border-white/10 bg-white/[0.02]"
              }`}
              key={item.id}
            >
              <div className="flex flex-wrap items-start gap-3">
                <label className="flex items-center gap-2 pt-2 text-sm text-zinc-300">
                  <input
                    checked={item.selected}
                    disabled={blocked}
                    onChange={(event) =>
                      updateItem(item.id, { selected: event.target.checked })
                    }
                    type="checkbox"
                  />
                  {blocked ? "Bỏ qua" : "Nhập nháp"}
                </label>
                <span
                  className={`rounded-full border px-2 py-0.5 text-xs ${
                    blocked
                      ? "border-zinc-600/50 text-zinc-500"
                      : item.status === "valid"
                        ? "border-emerald-400/30 text-emerald-200"
                        : "border-amber-400/30 text-amber-200"
                  }`}
                >
                  {STATUS_LABELS[item.status] ?? item.status}
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[7rem_minmax(0,1fr)]">
                <label className="block space-y-1 text-sm">
                  <span className="text-zinc-400">Số chương</span>
                  <input
                    className="min-h-11 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-zinc-100"
                    min={1}
                    onChange={(event) =>
                      updateItem(item.id, {
                        chapterNumber: Number.parseInt(event.target.value, 10) || 1
                      })
                    }
                    type="number"
                    value={item.chapterNumber}
                  />
                </label>
                <Input
                  label="Tiêu đề (không bắt buộc)"
                  onChange={(event) => updateItem(item.id, { title: event.target.value })}
                  value={item.title}
                />
              </div>

              <p className="mt-2 text-xs text-zinc-500">{item.wordCount.toLocaleString("vi-VN")} từ</p>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-300">
                {item.previewLines || "— (chưa có nội dung — có thể bổ sung sau)"}
              </p>

              {item.warnings.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-amber-200/90">
                  {item.warnings.map((warning) => (
                    <li key={warning}>• {warning}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
}
