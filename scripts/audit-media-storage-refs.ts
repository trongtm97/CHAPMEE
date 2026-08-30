/**
 * Read-only audit: scan DB text/json fields for hard-coded local media URLs or paths.
 *
 * Run: npx tsx scripts/audit-media-storage-refs.ts [--json] [--strict] [--limit=N]
 */
import { loadEnvLocal } from "./lib/load-env-local";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";

loadEnvLocal();

type Severity = "critical" | "high" | "medium" | "low";

type AuditHit = {
  table: string;
  id: string;
  field: string;
  excerpt: string;
  suspected_type: string;
  severity: Severity;
  recommended_fix: string;
};

const FORBIDDEN_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  severity: Severity;
  fix: string;
}> = [
  {
    name: "localhost_url",
    regex: /https?:\/\/localhost(?::\d+)?/i,
    severity: "critical",
    fix: "Re-upload via media pipeline; store object_key / media_asset_id only."
  },
  {
    name: "127.0.0.1_url",
    regex: /https?:\/\/127\.0\.0\.1(?::\d+)?/i,
    severity: "critical",
    fix: "Re-upload via media pipeline; store object_key / media_asset_id only."
  },
  {
    name: "minio_port",
    regex: /https?:\/\/[^/\s]+:900[01]\//i,
    severity: "critical",
    fix: "Replace absolute MinIO URL with object_key; resolve at read time via S3_PUBLIC_BASE_URL."
  },
  {
    name: "public_uploads_path",
    regex: /\/public\/uploads/i,
    severity: "critical",
    fix: "Migrate file to S3/MinIO; store object_key in entity field."
  },
  {
    name: "uploads_path",
    regex: /(?:^|["'\s])\/uploads\//i,
    severity: "high",
    fix: "Migrate to object storage; store object_key or media_asset_id."
  },
  {
    name: "file_protocol",
    regex: /file:\/\//i,
    severity: "critical",
    fix: "Remove file:// reference; upload to object storage."
  },
  {
    name: "windows_absolute_path",
    regex: /[a-zA-Z]:\\(?:[^"'\s]|\\)+/,
    severity: "critical",
    fix: "Remove local filesystem path; upload to object storage."
  },
  {
    name: "app_localhost_url",
    regex: /https?:\/\/localhost:3000/i,
    severity: "medium",
    fix: "Use canonical site URL or media resolver — not app origin for uploaded media."
  }
];

/** Scalar columns to scan directly. */
const SCALAR_FIELDS: Array<{ table: string; field: string; idColumn?: string }> = [
  { table: "profiles", field: "avatar_url" },
  { table: "stories", field: "cover_url" },
  { table: "episodes", field: "background_image_url" },
  { table: "reels_items", field: "background_image_url" },
  { table: "chapter_images", field: "image_url" },
  { table: "chapter_images", field: "thumb_url" },
  { table: "story_images", field: "original_url" },
  { table: "story_images", field: "portrait_url" },
  { table: "story_images", field: "landscape_url" },
  { table: "story_images", field: "square_url" },
  { table: "story_images", field: "thumb_url" },
  { table: "story_images", field: "blur_url" },
  { table: "taxonomy_terms", field: "og_image_url" },
  { table: "admin_content_posts", field: "cover_media_asset_id" },
  { table: "admin_content_posts", field: "og_image_media_asset_id" },
  { table: "admin_content_posts", field: "cover_image_url" },
  { table: "taxonomy_terms", field: "og_image_asset_id" },
  { table: "admin_content_posts", field: "og_image_url" },
  { table: "platform_announcements", field: "cover_image_url" },
  { table: "platform_announcements", field: "og_image_url" },
  { table: "collections", field: "cover_image_url" },
  { table: "storage_assets", field: "public_url" },
  { table: "storage_assets", field: "path" }
];

/** Large text/json columns — scan excerpt only. */
const JSON_TEXT_FIELDS: Array<{ table: string; field: string }> = [
  { table: "episodes", field: "content" },
  { table: "episodes", field: "structured_content" },
  { table: "stories", field: "standalone_content_json" },
  { table: "reels_items", field: "body" },
  { table: "app_settings", field: "value" }
];

function excerpt(value: string, max = 120): string {
  const oneLine = value.replace(/\s+/g, " ").trim();
  return oneLine.length <= max ? oneLine : `${oneLine.slice(0, max)}…`;
}

function scanValue(
  table: string,
  id: string,
  field: string,
  raw: string
): AuditHit[] {
  const hits: AuditHit[] = [];
  for (const pattern of FORBIDDEN_PATTERNS) {
    if (pattern.regex.test(raw)) {
      hits.push({
        table,
        id,
        field,
        excerpt: excerpt(raw),
        suspected_type: pattern.name,
        severity: pattern.severity,
        recommended_fix: pattern.fix
      });
    }
  }
  return hits;
}

async function tableExists(table: string): Promise<boolean> {
  const result = await db.execute(sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${table}
    ) as ok
  `);
  return Boolean((result.rows[0] as { ok?: boolean })?.ok);
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await db.execute(sql`
    select exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = ${table}
        and column_name = ${column}
    ) as ok
  `);
  return Boolean((result.rows[0] as { ok?: boolean })?.ok);
}

async function scanScalarField(
  table: string,
  field: string,
  idColumn = "id",
  rowLimit = 5000
): Promise<AuditHit[]> {
  if (!(await tableExists(table)) || !(await columnExists(table, field))) {
    return [];
  }

  const query = sql.raw(`
    select "${idColumn}" as row_id, "${field}" as val
    from public."${table}"
    where "${field}" is not null
      and trim("${field}"::text) <> ''
    limit ${rowLimit}
  `);

  const result = await db.execute(query);
  const hits: AuditHit[] = [];

  for (const row of result.rows as Array<{ row_id: string; val: string }>) {
    const val = String(row.val ?? "");
    hits.push(...scanValue(table, String(row.row_id), field, val));
  }

  return hits;
}

async function scanJsonTextField(
  table: string,
  field: string,
  rowLimit = 2000
): Promise<AuditHit[]> {
  if (!(await tableExists(table)) || !(await columnExists(table, field))) {
    return [];
  }

  const query = sql.raw(`
    select id as row_id, left("${field}"::text, 8000) as val
    from public."${table}"
    where "${field}" is not null
      and trim("${field}"::text) <> ''
    limit ${rowLimit}
  `);

  const result = await db.execute(query);
  const hits: AuditHit[] = [];

  for (const row of result.rows as Array<{ row_id: string; val: string }>) {
    const val = String(row.val ?? "");
    hits.push(...scanValue(table, String(row.row_id), field, val));
  }

  return hits;
}

async function main() {
  const asJson = process.argv.includes("--json");
  const strict = process.argv.includes("--strict");
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const rowLimit = limitArg ? Number(limitArg.split("=")[1]) : 5000;

  const startedAt = new Date().toISOString();
  let dbConnected = true;
  const allHits: AuditHit[] = [];

  try {
    await db.execute(sql`select 1`);
  } catch (error) {
    dbConnected = false;
    const message = error instanceof Error ? error.message : String(error);
    console.error(JSON.stringify({ ok: false, dbConnected, error: message }, null, 2));
    process.exit(2);
  }

  for (const spec of SCALAR_FIELDS) {
    const hits = await scanScalarField(spec.table, spec.field, spec.idColumn, rowLimit);
    allHits.push(...hits);
  }

  for (const spec of JSON_TEXT_FIELDS) {
    const hits = await scanJsonTextField(spec.table, spec.field, Math.min(rowLimit, 2000));
    allHits.push(...hits);
  }

  const bySeverity = {
    critical: allHits.filter((h) => h.severity === "critical").length,
    high: allHits.filter((h) => h.severity === "high").length,
    medium: allHits.filter((h) => h.severity === "medium").length,
    low: allHits.filter((h) => h.severity === "low").length
  };

  const summary = {
    ok: true,
    readOnly: true,
    startedAt,
    dbConnected,
    totalHits: allHits.length,
    bySeverity,
    hits: allHits
  };

  if (asJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Media storage reference audit (read-only)`);
    console.log(`DB connected: ${dbConnected}`);
    console.log(`Total hits: ${allHits.length}`);
    console.log(
      `Severity: critical=${bySeverity.critical} high=${bySeverity.high} medium=${bySeverity.medium} low=${bySeverity.low}`
    );
    if (allHits.length === 0) {
      console.log("No forbidden local media URL patterns found in scanned fields.");
    } else {
      for (const hit of allHits) {
        console.log(
          `[${hit.severity.toUpperCase()}] ${hit.table}.${hit.field} id=${hit.id} type=${hit.suspected_type}`
        );
        console.log(`  excerpt: ${hit.excerpt}`);
        console.log(`  fix: ${hit.recommended_fix}`);
      }
      if (strict) {
        console.error("\n--strict: failing because forbidden media URL patterns were found.");
        process.exit(1);
      }
    }
  }

  if (strict && allHits.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
