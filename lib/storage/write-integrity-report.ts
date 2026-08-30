import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

export function writeIntegrityReport(
  reportPath: string | null | undefined,
  payload: unknown
) {
  if (!reportPath?.trim()) {
    return;
  }
  const path = resolve(reportPath);
  writeFileSync(path, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
  console.log(`[report] wrote ${path}`);
}
