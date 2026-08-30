import * as XLSX from "xlsx";
import { parseCsv } from "@/lib/studio/csv";

function csvToAoA(csv: string, headerLabels?: string[]): string[][] {
  const trimmed = csv.trim();
  if (!trimmed) {
    return [];
  }

  const { headers, rows } = parseCsv(trimmed);
  const table = [headers, ...rows];
  if (headerLabels && headerLabels.length > 0) {
    table.splice(1, 0, headerLabels);
  }
  return table;
}

export function buildWorkbookBase64(
  sheets: Array<{ name: string; csv: string; headerLabels?: string[] }>
): string {
  const workbook = XLSX.utils.book_new();

  for (const sheet of sheets) {
    const data = csvToAoA(sheet.csv, sheet.headerLabels);
    if (data.length === 0) {
      continue;
    }

    const safeName = sheet.name.slice(0, 31).replace(/[\\/?*[\]]/g, "_");
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeName || "Sheet1");
  }

  if (workbook.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([["empty"]]),
      "empty"
    );
  }

  return XLSX.write(workbook, { type: "base64", bookType: "xlsx" });
}
