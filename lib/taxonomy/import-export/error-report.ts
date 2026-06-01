import type { TaxonomyImportValidationIssue } from "@/types/taxonomy-import-export";
import type { TaxonomyImportParsedRow } from "@/types/taxonomy-import-export";
import { escapeCsvCell } from "@/lib/taxonomy/import-export/columns";

export function buildValidationErrorReportCsv(
  issues: TaxonomyImportValidationIssue[]
): string {
  const header = ["row_number", "field", "value", "error_code", "severity", "message"];
  const lines = [header.join(",")];
  for (const issue of issues) {
    lines.push(
      [
        String(issue.rowNumber),
        issue.field,
        issue.value,
        issue.errorCode,
        issue.severity,
        issue.message
      ]
        .map((v) => escapeCsvCell(v))
        .join(",")
    );
  }
  return lines.join("\n");
}
