import * as XLSX from "xlsx";
import { normalizeHeader } from "@/lib/studio/csv";
import {
  isChaptersImportV2Headers,
  isStoriesImportV2Headers
} from "@/lib/studio/import-v2-headers";

export type ParsedImportSheet = {
  sheetName: string;
  headers: string[];
  rows: string[][];
  mode: "stories" | "chapters" | "unknown";
};

export type ImportSpreadsheetMode = "stories" | "chapters" | "unknown";

function aoaToTable(aoa: unknown[][]): { headers: string[]; rows: string[][] } {
  const cleaned = aoa
    .map((row) =>
      (row ?? []).map((cell) =>
        cell == null ? "" : String(cell).trim()
      )
    )
    .filter((row) => row.some((cell) => cell.length > 0));

  if (cleaned.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = cleaned[0].map((cell) => normalizeHeader(cell));
  const rows = cleaned.slice(1).map((row) => {
    const cells = [...row];
    while (cells.length < headers.length) {
      cells.push("");
    }
    return cells.slice(0, headers.length);
  });

  return { headers, rows };
}

function detectSheetMode(headers: string[]): ImportSpreadsheetMode {
  if (isStoriesImportV2Headers(headers)) return "stories";
  if (isChaptersImportV2Headers(headers)) return "chapters";
  return "unknown";
}

export function parseXlsxArrayBuffer(buffer: ArrayBuffer): ParsedImportSheet[] {
  const workbook = XLSX.read(buffer, { type: "array" });

  return workbook.SheetNames.map((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const aoa = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      defval: "",
      raw: false
    }) as unknown[][];

    const table = aoaToTable(aoa);
    return {
      sheetName,
      headers: table.headers,
      rows: table.rows,
      mode: detectSheetMode(table.headers)
    };
  }).filter((sheet) => sheet.headers.length > 0);
}

export function pickDefaultImportSheet(
  sheets: ParsedImportSheet[]
): ParsedImportSheet | null {
  if (sheets.length === 0) {
    return null;
  }

  const byName = (pattern: RegExp) =>
    sheets.find((sheet) => pattern.test(sheet.sheetName.toLowerCase()));

  return (
    byName(/^stories?(-|$)/) ??
    byName(/truyen/) ??
    sheets.find((sheet) => sheet.mode === "stories") ??
    byName(/^chapters?(-|$)/) ??
    byName(/chuong/) ??
    sheets.find((sheet) => sheet.mode === "chapters") ??
    sheets.find((sheet) => sheet.mode !== "unknown") ??
    sheets[0]
  );
}

export function sheetToCsvPreview(sheet: ParsedImportSheet): string {
  const lines = [sheet.headers.join(",")];
  for (const row of sheet.rows) {
    lines.push(
      row
        .map((cell) => {
          if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
            return `"${cell.replace(/"/g, '""')}"`;
          }
          return cell;
        })
        .join(",")
    );
  }
  return lines.join("\n");
}

export function listValidImportSheets(sheets: ParsedImportSheet[]) {
  return sheets.filter((sheet) => sheet.mode !== "unknown");
}
