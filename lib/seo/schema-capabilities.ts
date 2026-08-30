import type { DatabaseClient } from "@/lib/db/types";

let extendedSeoSchemaCache: boolean | null = null;
let seoChangeLogsTableCache: boolean | null = null;

export function isMissingColumnError(message: string | undefined) {
  if (!message) return false;
  return message.includes("does not exist");
}

export function isMissingTableError(message: string | undefined) {
  if (!message) return false;
  return message.includes("does not exist") && message.includes("relation");
}

export async function hasExtendedSeoRuleSchema(db: DatabaseClient): Promise<boolean> {
  if (extendedSeoSchemaCache !== null) return extendedSeoSchemaCache;
  const { error } = await db.from("seo_rules").select("include_sitemap").limit(1);
  extendedSeoSchemaCache = !(error && isMissingColumnError(error.message));
  return extendedSeoSchemaCache;
}

export async function hasSeoChangeLogsTable(db: DatabaseClient): Promise<boolean> {
  if (seoChangeLogsTableCache !== null) return seoChangeLogsTableCache;
  const { error } = await db.from("seo_change_logs").select("id").limit(1);
  seoChangeLogsTableCache = !(error && (isMissingTableError(error.message) || isMissingColumnError(error.message)));
  return seoChangeLogsTableCache;
}

export function resetSeoSchemaCache() {
  extendedSeoSchemaCache = null;
  seoChangeLogsTableCache = null;
}
