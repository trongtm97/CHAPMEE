import { IMPORT_CLEANUP_POLICY } from "@/types/import-pipeline";

export { IMPORT_CLEANUP_POLICY };

export type ImportCleanupCandidate = {
  objectKey: string;
  kind: "raw" | "processed";
  importJobId: string;
  jobStatus: string;
  ageDays: number;
};

/** Policy constants for scripts/cron — no automatic deletion in MVP. */
export function getImportRetentionDays(kind: "raw_failed" | "processed_temp" | "logs") {
  switch (kind) {
    case "raw_failed":
      return IMPORT_CLEANUP_POLICY.rawFailedRetentionDays;
    case "processed_temp":
      return IMPORT_CLEANUP_POLICY.processedTempRetentionDays;
    case "logs":
      return IMPORT_CLEANUP_POLICY.importLogsRetentionDays;
    default:
      return 30;
  }
}
