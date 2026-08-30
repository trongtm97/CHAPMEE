"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { parseCsv, serializeCsvTable } from "@/lib/studio/csv";
import {
  listValidImportSheets,
  parseXlsxArrayBuffer,
  pickDefaultImportSheet,
  sheetToCsvPreview,
  type ParsedImportSheet
} from "@/lib/studio/parse-import-spreadsheet";
import { readImportTextFile } from "@/lib/encoding/read-import-text-file";
import { postImportV2Csv } from "@/lib/studio/import-v2-client";
import { previewStoriesImportV2Action } from "@/lib/studio/import-export-v2-server";

type PreviewRow = {
  rowIndex: number;
  status: string;
  messages: string[];
  title: string;
};

type ActiveImport = {
  headers: string[];
  rows: string[][];
  mode: "stories" | "chapters";
  sheetName?: string;
};

function resolveActiveImport(
  payload: string,
  sheets: ParsedImportSheet[],
  selectedSheetName: string,
  mode: ImportMode
): ActiveImport | null {
  if (sheets.length > 0) {
    const sheet =
      sheets.find((item) => item.sheetName === selectedSheetName) ??
      pickDefaultImportSheet(sheets);

    if (!sheet || sheet.mode === "unknown") {
      return null;
    }

    if (mode !== "auto" && sheet.mode !== mode) {
      return null;
    }

    return {
      headers: sheet.headers,
      mode: sheet.mode,
      rows: sheet.rows,
      sheetName: sheet.sheetName
    };
  }

  if (!payload.trim()) {
    return null;
  }

  const parsed = parseCsv(payload);
  const stories = parsed.headers.length > 0 && isStoriesMode(parsed.headers);
  const chapters = !stories && isChaptersMode(parsed.headers);

  if (mode === "stories") {
    return stories
      ? { headers: parsed.headers, mode: "stories", rows: parsed.rows }
      : null;
  }
  if (mode === "chapters") {
    return chapters
      ? { headers: parsed.headers, mode: "chapters", rows: parsed.rows }
      : null;
  }

  if (stories) {
    return { headers: parsed.headers, mode: "stories", rows: parsed.rows };
  }
  if (chapters) {
    return { headers: parsed.headers, mode: "chapters", rows: parsed.rows };
  }

  return null;
}

function isStoriesMode(headers: string[]) {
  return headers.includes("title") && !headers.includes("chapter_order");
}

function isChaptersMode(headers: string[]) {
  return headers.includes("chapter_order") && headers.includes("story_code");
}

function previewStatusClass(status: string): string {
  if (status === "error") return "text-red-300";
  if (status === "warning") return "text-amber-300";
  return "text-emerald-300";
}

function previewStatusIcon(status: string): string {
  if (status === "error") return "✗ ";
  if (status === "warning") return "⚠ ";
  return "✓ ";
}

function validateChapterRows(headers: string[], rows: string[][]): PreviewRow[] {
  const storyIdx = headers.indexOf("story_code");
  const titleIdx = headers.indexOf("title");
  const orderIdx = headers.indexOf("chapter_order");
  const contentIdx = headers.indexOf("content");
  const structuredIdx = headers.indexOf("structured_content_json");

  return rows.slice(0, 100).map((cells, index) => {
    const msgs: string[] = [];
    const storyCode = cells[storyIdx]?.trim() ?? "";
    const chapterOrder = cells[orderIdx]?.trim() ?? "";
    const content = cells[contentIdx]?.trim() ?? "";
    const structuredJson = cells[structuredIdx]?.trim() ?? "";

    if (!storyCode) msgs.push("story_code bắt buộc");
    if (!chapterOrder) msgs.push("chapter_order bắt buộc");
    if (!/^\d+$/.test(chapterOrder) && chapterOrder) msgs.push("chapter_order phải là số");
    if (!content && !structuredJson) msgs.push("cần content hoặc structured_content_json");

    const title =
      cells[titleIdx]?.trim() ||
      (chapterOrder ? `Chương ${chapterOrder}` : "—");

    return {
      rowIndex: index + 2,
      status: msgs.length === 0 ? "valid" : "error",
      messages: msgs,
      title
    };
  });
}

type ImportMode = "auto" | "stories" | "chapters";

function buildImportCsvPayload(payload: string, active: ActiveImport): string {
  if (payload.trim()) {
    return payload;
  }
  return serializeCsvTable(active.headers, active.rows);
}

function sheetToImportCsv(sheet: ParsedImportSheet): string {
  return serializeCsvTable(sheet.headers, sheet.rows);
}

type StoriesImportV2PanelProps = {
  onGoToExport?: () => void;
  onJobRecorded?: () => void;
  onExit?: () => void;
  mode?: ImportMode;
};

export function StoriesImportV2Panel({
  onGoToExport,
  onJobRecorded,
  onExit,
  mode = "auto"
}: StoriesImportV2PanelProps) {
  const [pending, startTransition] = useTransition();
  const [payload, setPayload] = useState("");
  const [xlsxSheets, setXlsxSheets] = useState<ParsedImportSheet[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [report, setReport] = useState<string | null>(null);
  const [importDone, setImportDone] = useState(false);

  const validSheets = useMemo(() => listValidImportSheets(xlsxSheets), [xlsxSheets]);

  const active = useMemo(
    () => resolveActiveImport(payload, xlsxSheets, selectedSheetName, mode),
    [payload, selectedSheetName, xlsxSheets, mode]
  );

  const canImportAll =
    validSheets.some((sheet) => sheet.mode === "stories") &&
    validSheets.some((sheet) => sheet.mode === "chapters");

  const modeLabel = active
    ? active.mode === "stories"
      ? `truyện${active.sheetName ? ` — sheet ${active.sheetName}` : ""}`
      : `chương${active.sheetName ? ` — sheet ${active.sheetName}` : ""}`
    : fileLabel
      ? "chưa nhận diện sheet — chọn sheet khác"
      : `chưa nhận diện — dán CSV hoặc tải .csv / .xlsx`;

  const modeRestrictionNote =
    mode !== "auto" && !active
      ? `File không đúng định dạng ${
          mode === "stories" ? "truyện" : "chương"
        }. Vui lòng chọn file có cột phù hợp.`
      : null;

  function resetPreview() {
    setPreview(null);
    setReport(null);
  }

  function resetAll() {
    setPayload("");
    setXlsxSheets([]);
    setSelectedSheetName("");
    setFileLabel(null);
    setImportDone(false);
    resetPreview();
  }

  function loadSheets(sheets: ParsedImportSheet[], label: string) {
    setXlsxSheets(sheets);
    setPayload("");
    setFileLabel(label);
    const picked = pickDefaultImportSheet(sheets);
    setSelectedSheetName(picked?.sheetName ?? "");
    resetPreview();
  }

  function handleExit() {
    resetAll();
    onExit?.();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-300">
          {mode === "stories" ? (
            <>Import <strong>truyện</strong> — CSV/XLSX</>
          ) : mode === "chapters" ? (
            <>Import <strong>chương</strong> — CSV/XLSX. File xuất từ tab &quot;Xuất dữ liệu&quot; sẽ import đúng cột.</>
          ) : (
            <>
              Import <strong>truyện</strong> hoặc <strong>chương</strong> (CSV/XLSX). File XLSX
              nhiều sheet: chọn sheet hoặc dùng Import tất cả.
            </>
          )}
        </p>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          {onGoToExport ? (
            <Button onClick={onGoToExport} type="button" variant="secondary" className="text-xs">
              Xuất file có mã
            </Button>
          ) : null}
          <Button onClick={handleExit} type="button" variant="secondary" className="text-xs">
            Thoát
          </Button>
        </div>
      </div>

      <p className="text-xs text-zinc-500">
        Nhận diện: <span className="text-cyan-200">{modeLabel}</span>
        {fileLabel ? (
          <>
            {" "}
            · File: <span className="text-zinc-400">{fileLabel}</span>
          </>
        ) : null}
      </p>

      <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-100/90">
        Trường sai hoặc không khớp → bỏ qua trường đó, vẫn tạo <strong>nháp</strong>.
        Chỉ bỏ qua cả dòng khi thiếu tiêu đề (tạo mới) hoặc <code className="text-amber-200">story_code</code> không tồn tại.
        Xem sheet <strong>field_values_reference</strong> trong file mẫu để biết giá trị cột (ngôn ngữ gốc, sáng tác/dịch, …).
      </p>

      {modeRestrictionNote ? (
        <p className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-200">
          {modeRestrictionNote}
        </p>
      ) : null}

      {validSheets.length > 1 ? (
        <label className="block space-y-1 text-sm">
          <span className="text-xs font-semibold text-zinc-400">Sheet XLSX</span>
          <select
            className="min-h-10 w-full rounded-xl border border-white/10 bg-zinc-950 px-3 text-sm text-zinc-100"
            onChange={(event) => {
              setSelectedSheetName(event.target.value);
              resetPreview();
            }}
            value={selectedSheetName}
          >
            {validSheets.map((sheet) => (
              <option key={sheet.sheetName} value={sheet.sheetName}>
                {sheet.sheetName} ({sheet.mode === "stories" ? "truyện" : "chương"})
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <Textarea
        label="Dán CSV hoặc tải file .csv / .xlsx"
        onChange={(e) => {
          setPayload(e.target.value);
          setXlsxSheets([]);
          setSelectedSheetName("");
          setFileLabel(null);
          setImportDone(false);
          resetPreview();
        }}
        rows={8}
        value={
          xlsxSheets.length > 0 && active
            ? sheetToCsvPreview({
                sheetName: active.sheetName ?? "",
                headers: active.headers,
                rows: active.rows,
                mode: active.mode
              })
            : payload
        }
      />
      <input
        accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="block text-xs text-zinc-400 file:mr-3 file:rounded-lg file:border-0 file:bg-zinc-800 file:px-3 file:py-2 file:text-white"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;

          const lower = file.name.toLowerCase();
          if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
            const reader = new FileReader();
            reader.onload = () => {
              const buffer = reader.result;
              if (!(buffer instanceof ArrayBuffer)) return;
              const sheets = parseXlsxArrayBuffer(buffer);
              if (sheets.length === 0) {
                setReport("File XLSX trống hoặc không đọc được.");
                return;
              }
              loadSheets(sheets, file.name);
            };
            reader.readAsArrayBuffer(file);
          } else {
            void readImportTextFile(file)
              .then((text) => {
                setXlsxSheets([]);
                setSelectedSheetName("");
                setFileLabel(file.name);
                setPayload(text);
                setImportDone(false);
                resetPreview();
              })
              .catch(() => {
                setReport("Không đọc được file CSV. Hãy lưu UTF-8 hoặc Excel CSV chuẩn.");
              });
          }

          e.target.value = "";
        }}
        type="file"
      />

      {preview ? (
        <div className="max-h-64 overflow-y-auto rounded-xl border border-white/10 text-xs">
          <table className="w-full text-left">
            <thead className="bg-zinc-950/80 text-zinc-500">
              <tr>
                <th className="px-2 py-1">#</th>
                <th className="px-2 py-1">Tiêu đề</th>
                <th className="px-2 py-1">Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {preview.map((row) => (
                <tr className="border-t border-white/5" key={row.rowIndex}>
                  <td className="px-2 py-1">{row.rowIndex}</td>
                  <td className="px-2 py-1 max-w-[200px] truncate">{row.title}</td>
                  <td className={`px-2 py-1 ${previewStatusClass(row.status)}`}>
                    {previewStatusIcon(row.status)}
                    {row.messages.length > 0 ? row.messages.join(" · ") : "OK"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {preview.filter((r) => r.status === "error").length > 0 ? (
            <p className="px-2 py-1 text-rose-300">
              {preview.filter((r) => r.status === "error").length} dòng không import được — sửa lỗi chặn (thiếu tiêu đề hoặc story_code sai).
            </p>
          ) : null}
          {preview.filter((r) => r.status === "warning").length > 0 ? (
            <p className="px-2 py-1 text-amber-300">
              {preview.filter((r) => r.status === "warning").length} dòng cảnh báo — vẫn import nháp, một số trường sẽ bị bỏ qua.
            </p>
          ) : null}
        </div>
      ) : null}

      {report ? (
        <div className={`rounded-lg border px-3 py-2 text-sm whitespace-pre-wrap ${
          report.includes("Lỗi") || report.includes("lỗi")
            ? "border-amber-500/20 bg-amber-500/10 text-amber-100"
            : "border-emerald-500/20 bg-emerald-500/10 text-emerald-100"
        }`}>
          {report}
        </div>
      ) : null}

      {importDone ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={resetAll} type="button" variant="secondary">
            Nhập file khác
          </Button>
          <Button onClick={handleExit} type="button">
            Thoát — không nhập nữa
          </Button>
        </div>
      ) : report && !preview ? (
        <div className="flex flex-wrap gap-2">
          <Button onClick={resetAll} type="button" variant="secondary">
            Nhập file khác
          </Button>
          <Button onClick={handleExit} type="button" variant="secondary">
            Thoát
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            disabled={pending || !active}
            onClick={() =>
              startTransition(async () => {
                if (!active) return;

                if (active.mode === "chapters") {
                  setPreview(validateChapterRows(active.headers, active.rows));
                  return;
                }

                const result = await previewStoriesImportV2Action({
                  csvText: buildImportCsvPayload(payload, active)
                });
                if (result.error) {
                  setReport(result.error);
                  return;
                }
                setPreview(
                  result.rows.map((r) => ({
                    rowIndex: r.rowIndex,
                    status: r.status,
                    messages: r.messages,
                    title: r.data.title
                  }))
                );
              })
            }
            type="button"
            variant="secondary"
          >
            Preview
          </Button>
          <Button
            disabled={pending || !active}
            onClick={() =>
              startTransition(async () => {
                if (!active) return;

                if (active.mode === "chapters") {
                  const result = await postImportV2Csv(
                    "/api/studio/import/chapters-v2",
                    buildImportCsvPayload(payload, active)
                  );
                  if (result.error) {
                    setReport(result.error);
                    return;
                  }
                  const errCount = result.errors.length;
                  const errSample = result.errors.slice(0, 3).map((e) => `Dòng ${e.rowIndex}: ${e.message}`).join("\n");
                  setReport(
                    `Kết quả chương:\n` +
                    `✓ Tạo mới: ${result.created}\n` +
                    `~ Cập nhật: ${result.updated}\n` +
                    `✗ Lỗi: ${errCount}` +
                    (errSample ? `\n${errSample}` : "")
                  );
                  setPreview(null);
                  setPayload("");
                  setXlsxSheets([]);
                  setSelectedSheetName("");
                  setFileLabel(null);
                  setImportDone(true);
                  onJobRecorded?.();
                  return;
                }

                const result = await postImportV2Csv(
                  "/api/studio/import/stories-v2",
                  buildImportCsvPayload(payload, active)
                );
                if (result.error && result.created === 0 && result.updated === 0 && result.errors.length === 0) {
                  setReport(result.error);
                  return;
                }
                const errCount = result.errors.length;
                const errSample = result.errors.slice(0, 3).map((e) => `Dòng ${e.rowIndex}: ${e.message}`).join("\n");
                setReport(
                  `Kết quả truyện:\n` +
                  `✓ Tạo mới: ${result.created}\n` +
                  `~ Cập nhật: ${result.updated}\n` +
                  `✗ Lỗi: ${errCount}` +
                  (errSample ? `\n${errSample}` : "")
                );
                setPreview(null);
                setPayload("");
                setXlsxSheets([]);
                setSelectedSheetName("");
                setFileLabel(null);
                setImportDone(true);
                onJobRecorded?.();
              })
            }
            type="button"
          >
            Import ngay
          </Button>
          {canImportAll && mode === "auto" ? (
            <Button
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const storiesSheet = validSheets.find((sheet) => sheet.mode === "stories");
                  const chaptersSheet = validSheets.find((sheet) => sheet.mode === "chapters");
                  const parts: string[] = [];

                  if (storiesSheet) {
                    const storiesResult = await postImportV2Csv(
                      "/api/studio/import/stories-v2",
                      sheetToImportCsv(storiesSheet)
                    );
                    parts.push(
                      `Truyện: +${storiesResult.created} / ~${storiesResult.updated} / lỗi ${storiesResult.errors.length}`
                    );
                  }

                  if (chaptersSheet) {
                    const chaptersResult = await postImportV2Csv(
                      "/api/studio/import/chapters-v2",
                      sheetToImportCsv(chaptersSheet)
                    );
                    parts.push(
                      `Chương: +${chaptersResult.created} / ~${chaptersResult.updated} / lỗi ${chaptersResult.errors.length}`
                    );
                  }

                  setReport(parts.join("\n"));
                  setPreview(null);
                  setPayload("");
                  setXlsxSheets([]);
                  setSelectedSheetName("");
                  setFileLabel(null);
                  setImportDone(true);
                  onJobRecorded?.();
                })
              }
              type="button"
              variant="secondary"
            >
              Import tất cả sheet
            </Button>
          ) : null}
          <Button disabled={pending} onClick={handleExit} type="button" variant="secondary">
            Thoát — không nhập nữa
          </Button>
        </div>
      )}
    </div>
  );
}
