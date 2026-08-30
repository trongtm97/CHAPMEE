/**
 * Self-test: CSV/XLSX import preserves cell newlines (Excel Alt+Enter).
 * Run: npx tsx scripts/import-multiline-self-test.mjs
 */

import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const csvMod = await import(pathToFileURL(join(root, "lib/studio/csv.ts")).href);
const sheetMod = await import(
  pathToFileURL(join(root, "lib/studio/parse-import-spreadsheet.ts")).href
);
const xlsxMod = await import(pathToFileURL(join(root, "lib/studio/build-import-xlsx.ts")).href);
const cellMod = await import(
  pathToFileURL(join(root, "lib/encoding/normalize-import-cell.ts")).href
);

const { parseCsv, serializeCsvTable } = csvMod;
const { parseXlsxArrayBuffer } = sheetMod;
const { buildWorkbookBase64 } = xlsxMod;
const { normalizeImportCell } = cellMod;

const sampleContent = "line1\n\n\"hello\"\nline2";
const headers = ["story_code", "chapter_order", "title", "content"];
const rows = [["123", "1", "Ch1", sampleContent]];

let failed = 0;

function fail(msg) {
  console.error("FAIL", msg);
  failed += 1;
}

function ok(msg) {
  console.log("OK", msg);
}

// CSV multiline quoted parse
const csvText =
  "story_code,chapter_order,title,content\n123,1,Ch1,\"line1\n\n\"\"hello\"\"\nline2\"";
const parsed = parseCsv(csvText);
const contentIdx = parsed.headers.indexOf("content");
const content = parsed.rows[0]?.[contentIdx] ?? "";
if (content !== sampleContent) {
  fail(`parseCsv multiline: got ${JSON.stringify(content)}`);
} else {
  ok("parseCsv multiline quoted");
}

// serialize round-trip
const ser = serializeCsvTable(headers, rows);
const p2 = parseCsv(ser);
const content2 = p2.rows[0]?.[p2.headers.indexOf("content")] ?? "";
if (content2 !== sampleContent) {
  fail(`serialize round-trip: got ${JSON.stringify(content2)}`);
} else {
  ok("serialize round-trip");
}

// XLSX round-trip
const xlsxBase64 = buildWorkbookBase64([
  { name: "chapters", csv: serializeCsvTable(headers, rows) }
]);
const buf = Buffer.from(xlsxBase64, "base64");
const sheets = parseXlsxArrayBuffer(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
);
const chSheet = sheets.find((s) => s.mode === "chapters") ?? sheets[0];
const xlsxContent = chSheet.rows[0]?.[chSheet.headers.indexOf("content")] ?? "";
if (xlsxContent !== sampleContent) {
  fail(`XLSX round-trip: got ${JSON.stringify(xlsxContent)}`);
} else {
  ok("XLSX round-trip");
}

// normalizeImportCell trims edges only
const norm = normalizeImportCell("\nline1\nline2\n");
if (norm !== "line1\nline2") {
  fail(`normalizeImportCell: got ${JSON.stringify(norm)}`);
} else {
  ok("normalizeImportCell internal newlines");
}

// Unquoted multiline CSV (broken Excel export) — should split into wrong rows
const badCsv = "a,content\n1,line1\nline2";
const badParsed = parseCsv(badCsv);
if (badParsed.rows.length === 1) {
  fail("unquoted multiline should NOT be one row (documents known limitation)");
} else {
  ok(`unquoted multiline splits to ${badParsed.rows.length} rows (expected breakage)`);
}

if (failed) {
  console.error(`\nimport-multiline self-test: ${failed} failed`);
  process.exit(1);
}
console.log("\nimport-multiline self-test: all passed");
