import { sanitizeImportText } from "@/lib/encoding/sanitize-import-text";
import {
  isVietnameseLabelRow,
  resolveImportHeaderLabels
} from "@/lib/studio/import-v2-header-labels";

const UTF8_BOM = "\uFEFF";

export function normalizeHeader(header: string): string {
  return header
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function countUnquotedDelimiters(line: string, delimiter: "," | ";"): number {
  let count = 0;
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        index += 1;
        continue;
      }
      if (char === '"') {
        inQuotes = false;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      count += 1;
    }
  }

  return count;
}

export function detectCsvDelimiter(headerLine: string): "," | ";" {
  const commas = countUnquotedDelimiters(headerLine, ",");
  const semicolons = countUnquotedDelimiters(headerLine, ";");

  if (semicolons > commas) {
    return ";";
  }

  return ",";
}

function parseCsvLine(line: string, delimiter: "," | ";" = ","): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      fields.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  fields.push(current);
  return fields;
}

/** RFC 4180 — giữ xuống dòng trong ô quoted (hội thoại `""...`""). */
function parseCsvRecords(text: string, delimiter: "," | ";"): string[][] {
  const records: string[][] = [];
  let record: string[] = [];
  let field = "";
  let inQuotes = false;

  const pushRecord = () => {
    record.push(field);
    if (record.some((cell) => cell.length > 0)) {
      records.push(record);
    }
    record = [];
    field = "";
  };

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (inQuotes) {
      if (char === '"') {
        if (text[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
        continue;
      }
      field += char;
      continue;
    }

    if (char === '"') {
      inQuotes = true;
      continue;
    }

    if (char === delimiter) {
      record.push(field);
      field = "";
      continue;
    }

    if (char === "\r") {
      if (text[index + 1] === "\n") {
        index += 1;
      }
      pushRecord();
      continue;
    }

    if (char === "\n") {
      pushRecord();
      continue;
    }

    field += char;
  }

  if (field.length > 0 || record.length > 0) {
    pushRecord();
  }

  return records;
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const normalized = sanitizeImportText(text)
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  if (!normalized.trim()) {
    return { headers: [], rows: [] };
  }

  const headerLineEnd = normalized.indexOf("\n");
  const headerLine =
    headerLineEnd === -1 ? normalized : normalized.slice(0, headerLineEnd);
  const delimiter = detectCsvDelimiter(headerLine);
  const records = parseCsvRecords(normalized, delimiter);

  if (records.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = records[0].map(normalizeHeader);
  let bodyRows = records.slice(1);

  const labelMap = resolveImportHeaderLabels(headers);
  if (bodyRows.length > 0 && labelMap) {
    const labelCells = bodyRows[0];
    while (labelCells.length < headers.length) {
      labelCells.push("");
    }
    if (isVietnameseLabelRow(headers, labelCells.slice(0, headers.length), labelMap)) {
      bodyRows = bodyRows.slice(1);
    }
  }

  const rows = bodyRows.map((cells) => {
    while (cells.length < headers.length) {
      cells.push("");
    }
    return cells;
  });

  return { headers, rows };
}

function escapeCsvField(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportRowsToCsv(headers: string[], rows: Array<Record<string, string>>): string {
  const headerLine = headers.map(escapeCsvField).join(",");
  const bodyLines = rows.map((row) =>
    headers.map((header) => escapeCsvField(row[header] ?? "")).join(",")
  );

  return `${UTF8_BOM}${[headerLine, ...bodyLines].join("\n")}`;
}

export function serializeCsvTable(headers: string[], rows: string[][]): string {
  return exportRowsToCsv(
    headers,
    rows.map((cells) =>
      Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""]))
    )
  );
}

export function ensureUtf8Bom(content: string): string {
  return content.startsWith(UTF8_BOM) ? content : `${UTF8_BOM}${content}`;
}

export function downloadTextFile(content: string, fileName: string, mimeType = "text/csv;charset=utf-8") {
  const bytes = new TextEncoder().encode(ensureUtf8Bom(content));
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatExportFileName(dataType: string, extension: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `chapmee_studio_${dataType}_${date}.${extension}`;
}

if (process.env.NODE_ENV !== "production") {
  const sample =
    'a,content\n1,"line1\n\n""hello""\nline2"';
  const parsed = parseCsv(sample);
  const contentIdx = parsed.headers.indexOf("content");
  const content = parsed.rows[0]?.[contentIdx] ?? "";
  if (!content.includes("\n") || !content.includes('"hello"')) {
    throw new Error("parseCsv: multiline quoted content must preserve newlines and dialogue quotes");
  }
}
