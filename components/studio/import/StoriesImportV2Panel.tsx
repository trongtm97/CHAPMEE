"use client";

import { useMemo, useState, useTransition } from "react";
import { Button, Textarea } from "@/components/ui";
import { parseCsv } from "@/lib/studio/csv";
import {
  listValidImportSheets,
  parseXlsxArrayBuffer,
  pickDefaultImportSheet,
  sheetToCsvPreview,
  type ParsedImportSheet
} from "@/lib/studio/parse-import-spreadsheet";
import {
  executeChaptersImportV2Action,
  executeStoriesImportV2Action,
  previewStoriesImportV2Action
} from "@/lib/studio/import-export-v2-server";

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
  selectedSheetName: string
): ActiveImport | null {
  if (sheets.length > 0) {
    const sheet =
      sheets.find((item) => item.sheetName === selectedSheetName) ??
      pickDefaultImportSheet(sheets);

    if (!sheet || sheet.mode === "unknown") {
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

  if (stories) {
    return { headers: parsed.headers, mode: "stories", rows: parsed.rows };
  }
  if (chapters) {
    return { headers: parsed.headers, mode: "chapters", rows: parsed.rows };
  }

  return null;
}

function isStoriesMode(headers: string[]) {
  return headers.includes("content_type_slug") && headers.includes("main_genre_slug");
}

function isChaptersMode(headers: string[]) {
  return headers.includes("chapter_order") && headers.includes("story_code");
}

export function StoriesImportV2Panel({ onJobRecorded }: { onJobRecorded?: () => void }) {
  const [pending, startTransition] = useTransition();
  const [payload, setPayload] = useState("");
  const [xlsxSheets, setXlsxSheets] = useState<ParsedImportSheet[]>([]);
  const [selectedSheetName, setSelectedSheetName] = useState("");
  const [fileLabel, setFileLabel] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewRow[] | null>(null);
  const [report, setReport] = useState<string | null>(null);

  const validSheets = useMemo(() => listValidImportSheets(xlsxSheets), [xlsxSheets]);

  const active = useMemo(
    () => resolveActiveImport(payload, xlsxSheets, selectedSheetName),
    [payload, selectedSheetName, xlsxSheets]
  );

  const canImportAll =
    validSheets.some((sheet) => sheet.mode === "stories") &&
    validSheets.some((sheet) => sheet.mode === "chapters");

  const modeLabel = active
    ? active.mode === "stories"
      ? `truyện (taxonomy v2)${active.sheetName ? ` — sheet ${active.sheetName}` : ""}`
      : `chương${active.sheetName ? ` — sheet ${active.sheetName}` : ""}`
    : fileLabel
      ? "chưa nhận diện sheet — chọn sheet khác"
      : "chưa nhận diện — dán CSV hoặc tải .csv / .xlsx";

  function resetPreview() {
    setPreview(null);
    setReport(null);
  }

  function loadSheets(sheets: ParsedImportSheet[], label: string) {
    setXlsxSheets(sheets);
    setPayload("");
    setFileLabel(label);
    const picked = pickDefaultImportSheet(sheets);
    setSelectedSheetName(picked?.sheetName ?? "");
    resetPreview();
  }

  return (
    <div className="space-y-4 rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-5">
      <p className="text-sm text-zinc-300">
        Import <strong>taxonomy v2</strong> (CSV/XLSX) hoặc <strong>chapters</strong>. File XLSX
        nhiều sheet: chọn sheet hoặc dùng Import tất cả (truyện + chương).
      </p>
      <p className="text-xs text-zinc-500">
        Nhận diện: <span className="text-cyan-200">{modeLabel}</span>
        {fileLabel ? (
          <>
            {" "}
            · File: <span className="text-zinc-400">{fileLabel}</span>
          </>
        ) : null}
      </p>

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
            const reader = new FileReader();
            reader.onload = () => {
              setXlsxSheets([]);
              setSelectedSheetName("");
              setFileLabel(file.name);
              setPayload(String(reader.result ?? ""));
              resetPreview();
            };
            reader.readAsText(file, "UTF-8");
          }

          e.target.value = "";
        }}
        type="file"
      />

      {preview ? (
        <div className="max-h-48 overflow-y-auto rounded-xl border border-white/10 text-xs">
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
                  <td className="px-2 py-1">{row.title}</td>
                  <td
                    className={`px-2 py-1 ${row.status === "error" ? "text-red-300" : "text-emerald-300"}`}
                  >
                    {row.status}
                    {row.messages[0] ? ` — ${row.messages[0]}` : ""}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {report ? (
        <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-100 whitespace-pre-wrap">
          {report}
        </p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button
          disabled={pending || !active}
          onClick={() =>
            startTransition(async () => {
              if (!active) return;

              if (active.mode === "chapters") {
                setPreview(
                  active.rows.slice(0, 50).map((cells, index) => {
                    const storyIdx = active.headers.indexOf("story_code");
                    const titleIdx = active.headers.indexOf("title");
                    const orderIdx = active.headers.indexOf("chapter_order");
                    return {
                      rowIndex: index + 2,
                      status: cells[storyIdx]?.trim() ? "valid" : "error",
                      messages: cells[storyIdx]?.trim() ? [] : ["story_code bắt buộc"],
                      title:
                        cells[titleIdx]?.trim() ||
                        (cells[orderIdx] ? `Chương ${cells[orderIdx]}` : "—")
                    };
                  })
                );
                return;
              }

              const result = await previewStoriesImportV2Action({
                headers: active.headers,
                rows: active.rows
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
                const result = await executeChaptersImportV2Action({
                  headers: active.headers,
                  rows: active.rows
                });
                setReport(
                  `Chương — Tạo ${result.created} · Cập nhật ${result.updated} · Lỗi ${result.errors.length}`
                );
                onJobRecorded?.();
                return;
              }

              const result = await executeStoriesImportV2Action({
                headers: active.headers,
                rows: active.rows,
                skipInvalid: true
              });
              setReport(
                `Truyện — Tạo ${result.created} · Cập nhật ${result.updated} · Lỗi ${result.errors.length}`
              );
              onJobRecorded?.();
            })
          }
          type="button"
        >
          Import sheet hiện tại
        </Button>
        {canImportAll ? (
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const storiesSheet = validSheets.find((sheet) => sheet.mode === "stories");
                const chaptersSheet = validSheets.find((sheet) => sheet.mode === "chapters");
                const parts: string[] = [];

                if (storiesSheet) {
                  const storiesResult = await executeStoriesImportV2Action({
                    headers: storiesSheet.headers,
                    rows: storiesSheet.rows,
                    skipInvalid: true
                  });
                  parts.push(
                    `Truyện: +${storiesResult.created} / ~${storiesResult.updated} / lỗi ${storiesResult.errors.length}`
                  );
                }

                if (chaptersSheet) {
                  const chaptersResult = await executeChaptersImportV2Action({
                    headers: chaptersSheet.headers,
                    rows: chaptersSheet.rows
                  });
                  parts.push(
                    `Chương: +${chaptersResult.created} / ~${chaptersResult.updated} / lỗi ${chaptersResult.errors.length}`
                  );
                }

                setReport(parts.join("\n"));
                onJobRecorded?.();
              })
            }
            type="button"
            variant="secondary"
          >
            Import tất cả sheet
          </Button>
        ) : null}
      </div>
    </div>
  );
}
