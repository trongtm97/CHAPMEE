"use client";

import { Input } from "@/components/ui";
import { BULK_IMPORT_MAX_CHAPTERS, type ImportChapterPreview } from "@/types/import";

const STATUS_LABELS: Record<string, string> = {
  content_short: "Nội dung ngắn",
  duplicate_in_file: "Trùng số chương",
  duplicate_in_story: "Chương đã tồn tại",
  missing_content: "Thiếu nội dung",
  title_too_long: "Tiêu đề quá dài",
  valid: "Hợp lệ"
};

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

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold text-white">
          Xem trước ({previews.length} chương)
        </h2>
        <p className="text-sm text-zinc-500">
          Đã chọn {selectedCount}/{Math.min(previews.length, BULK_IMPORT_MAX_CHAPTERS)} chương
        </p>
      </div>

      <div className="space-y-3">
        {previews.map((item) => {
          const blocked = [
            "missing_content",
            "duplicate_in_file",
            "duplicate_in_story",
            "title_too_long"
          ].includes(item.status);

          return (
            <article
              className={`rounded-2xl border p-4 ${
                blocked ? "border-rose-400/30 bg-rose-400/5" : "border-white/10 bg-white/[0.02]"
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
                  Chọn nhập
                </label>
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-xs text-zinc-400">
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
                  label="Tiêu đề"
                  onChange={(event) => updateItem(item.id, { title: event.target.value })}
                  value={item.title}
                />
              </div>

              <p className="mt-2 text-xs text-zinc-500">{item.wordCount.toLocaleString("vi-VN")} từ</p>
              <p className="mt-2 line-clamp-3 whitespace-pre-wrap text-sm text-zinc-300">
                {item.previewLines || "—"}
              </p>

              {item.warnings.length > 0 ? (
                <ul className="mt-2 space-y-1 text-xs text-amber-200">
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
