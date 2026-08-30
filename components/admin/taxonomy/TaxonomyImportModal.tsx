"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { TAXONOMY_IMPORT_EXPORT_HREF } from "@/lib/taxonomy/admin-tabs";
import {
  exportTaxonomyTermsCsvAction,
  exportTaxonomyTermsJsonAction,
  importTaxonomyTermsAdminAction
} from "@/lib/admin/taxonomy-actions";
import {
  previewTaxonomyCatalogImportAction
} from "@/lib/admin/taxonomy-import-export-actions";
import { readImportTextFile } from "@/lib/encoding/read-import-text-file";
import { TAXONOMY_CSV_IMPORT_TEMPLATE } from "@/lib/taxonomy/csv-import-template";
import type { TaxonomyExportScope } from "@/lib/taxonomy/admin-data";
import type { TaxonomyAdminNotify } from "@/lib/taxonomy/admin-ui";

type TaxonomyImportModalProps = {
  open: boolean;
  exportScope?: TaxonomyExportScope;
  onClose: () => void;
  onMessage: TaxonomyAdminNotify;
  onDone: () => void;
};

export function TaxonomyImportModal({
  open,
  exportScope,
  onClose,
  onMessage,
  onDone
}: TaxonomyImportModalProps) {
  const [pending, startTransition] = useTransition();
  const [payload, setPayload] = useState(TAXONOMY_CSV_IMPORT_TEMPLATE);
  const [format, setFormat] = useState<"csv" | "json">("csv");
  const [mode, setMode] = useState<"create" | "update" | "upsert">("upsert");
  const [preview, setPreview] = useState<{
    rowCount: number;
    errorCount: number;
    warningCount: number;
    canImport: boolean;
    errors: string[];
  } | null>(null);
  const [report, setReport] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setPayload(TAXONOMY_CSV_IMPORT_TEMPLATE);
    setFormat("csv");
    setMode("upsert");
    setPreview(null);
    setReport(null);
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-zinc-700 bg-[#0c1118]">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Nhập / xuất taxonomy</h2>
            <p className="text-xs text-zinc-500">CSV hoặc JSON · preview trước khi ghi</p>
          </div>
          <Button onClick={onClose} type="button" variant="ghost">
            Đóng
          </Button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 py-4">
          <p className="rounded-lg border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
            Modal nhập nhanh — dùng{" "}
            <Link className="font-semibold underline" href={TAXONOMY_IMPORT_EXPORT_HREF}>
              Nhập/Xuất taxonomy
            </Link>{" "}
            để preview đầy đủ, XLSX, validation Composer block và lịch sử job.
          </p>
          <div className="flex flex-wrap gap-2">
            <select
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(e) => setFormat(e.target.value as "csv" | "json")}
              value={format}
            >
              <option value="csv">CSV</option>
              <option value="json">JSON</option>
            </select>
            <select
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white"
              onChange={(e) => setMode(e.target.value as typeof mode)}
              value={mode}
            >
              <option value="create">Chỉ tạo mới</option>
              <option value="update">Chỉ cập nhật (type+slug)</option>
              <option value="upsert">Upsert</option>
            </select>
            <Button
              onClick={() => setPayload(TAXONOMY_CSV_IMPORT_TEMPLATE)}
              type="button"
              variant="secondary"
            >
              Template mẫu
            </Button>
            <Button
              onClick={() =>
                startTransition(async () => {
                  const result = await exportTaxonomyTermsCsvAction(exportScope);
                  if (result.error) {
                    onMessage(result.error);
                    return;
                  }
                  const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `taxonomy-export-${Date.now()}.csv`;
                  a.click();
                  URL.revokeObjectURL(url);
                  onMessage(null);
                })
              }
              type="button"
              variant="secondary"
            >
              Xuất CSV
            </Button>
            <Button
              onClick={() =>
                startTransition(async () => {
                  const result = await exportTaxonomyTermsJsonAction(exportScope);
                  if (result.error) {
                    onMessage(result.error);
                    return;
                  }
                  const blob = new Blob([result.json], {
                    type: "application/json;charset=utf-8"
                  });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `taxonomy-export-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  onMessage(null);
                })
              }
              type="button"
              variant="secondary"
            >
              Xuất JSON
            </Button>
          </div>

          <label className="block text-sm">
            <span className="text-zinc-400">Tải file CSV / JSON</span>
            <input
              accept=".csv,.json,text/csv,application/json"
              className="mt-1 block w-full text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-sm file:text-white"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.name.endsWith(".json")) {
                  const reader = new FileReader();
                  reader.onload = () => {
                    setPayload(String(reader.result ?? ""));
                    setFormat("json");
                    setPreview(null);
                    setReport(null);
                  };
                  reader.readAsText(file, "UTF-8");
                } else {
                  void readImportTextFile(file)
                    .then((text) => {
                      setPayload(text);
                      setFormat("csv");
                      setPreview(null);
                      setReport(null);
                    })
                    .catch(() => {
                      onMessage(
                        "File CSV không phải UTF-8 hợp lệ hoặc được lưu từ Excel ở định dạng cũ. " +
                          "Vui lòng tải template CSV UTF-8 từ hệ thống, hoặc upload file .xlsx."
                      );
                    });
                }
                e.target.value = "";
              }}
              type="file"
            />
          </label>

          <Textarea
            label="Dữ liệu (hoặc dán / tải file)"
            onChange={(e) => setPayload(e.target.value)}
            rows={12}
            value={payload}
          />

          {preview ? (
            <div className="rounded-lg border border-white/10 bg-zinc-950/50 p-3 text-sm">
              <p className="text-zinc-300">
                Preview: {preview.rowCount} dòng
                {preview.errorCount ? ` · ${preview.errorCount} lỗi` : ""}
                {preview.warningCount ? ` · ${preview.warningCount} cảnh báo` : ""}
                {preview.canImport ? " · OK import" : " · Chặn import"}
              </p>
              {preview.errors.length > 0 ? (
                <ul className="mt-2 max-h-32 overflow-y-auto text-xs text-amber-200/90">
                  {preview.errors.slice(0, 12).map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          ) : null}

          {report ? (
            <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100">
              {report}
            </p>
          ) : null}
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-800 px-5 py-4">
          <Button
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                if (format === "json") {
                  const result = await importTaxonomyTermsAdminAction({
                    payload,
                    format: "json",
                    mode,
                    dryRun: true
                  });
                  setPreview({
                    rowCount: result.imported,
                    errorCount: result.errors.length,
                    warningCount: 0,
                    canImport: result.errors.length === 0,
                    errors: result.errors
                  });
                  onMessage(result.error);
                  return;
                }
                const result = await previewTaxonomyCatalogImportAction({
                  content: payload,
                  format: "csv",
                  mode
                });
                if (!result.preview) {
                  onMessage(result.error ?? "Preview thất bại.");
                  return;
                }
                setPreview({
                  rowCount: result.preview.rows.length,
                  errorCount: result.preview.errorCount,
                  warningCount: result.preview.warningCount,
                  canImport: result.preview.canImport,
                  errors: result.preview.issues.map(
                    (i) =>
                      `${i.rowNumber > 0 ? `Dòng ${i.rowNumber}: ` : ""}${i.message}`
                  )
                });
                onMessage(result.preview.canImport ? null : "Có lỗi validation.");
              })
            }
            type="button"
            variant="secondary"
          >
            Preview
          </Button>
          <Button
            disabled={pending || (preview !== null && !preview.canImport)}
            loading={pending}
            onClick={() =>
              startTransition(async () => {
                const result = await importTaxonomyTermsAdminAction({
                  payload,
                  format,
                  mode,
                  dryRun: false
                });
                setReport(
                  `Tạo ${result.created} · Cập nhật ${result.updated} · Bỏ qua ${result.skipped}` +
                    (result.error ? ` · Lỗi: ${result.error}` : "")
                );
                if (result.error && result.created + result.updated === 0) {
                  onMessage(result.error);
                  return;
                }
                onMessage(
                  `Nhập xong: tạo ${result.created}, cập nhật ${result.updated}.`,
                  "success"
                );
                onDone();
              })
            }
            type="button"
          >
            Nhập
          </Button>
        </div>
      </div>
    </div>
  );
}
