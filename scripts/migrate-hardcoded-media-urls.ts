/**
 * Dry-run migration: map hard-coded internal media URLs → media_asset_id / object_key.
 *
 * Default: --dry-run (no writes).
 * Apply requires --apply --backup-file=path.json
 *
 * Run:
 *   npx tsx scripts/migrate-hardcoded-media-urls.ts --dry-run --limit=50
 */
import { writeFileSync } from "node:fs";
import { loadEnvLocal } from "./lib/load-env-local";
import { sql } from "drizzle-orm";
import { db } from "../lib/db";
import { extractObjectKeyFromPublicUrl } from "../lib/media/media-resolver";

loadEnvLocal();

type MigrationTarget = {
  table: string;
  idColumn: string;
  urlField: string;
  assetIdField: string;
};

const TARGETS: MigrationTarget[] = [
  {
    table: "admin_content_posts",
    idColumn: "id",
    urlField: "cover_image_url",
    assetIdField: "cover_media_asset_id"
  },
  {
    table: "admin_content_posts",
    idColumn: "id",
    urlField: "og_image_url",
    assetIdField: "og_image_media_asset_id"
  },
  {
    table: "profiles",
    idColumn: "id",
    urlField: "avatar_url",
    assetIdField: "avatar_media_id"
  },
  {
    table: "stories",
    idColumn: "id",
    urlField: "cover_url",
    assetIdField: "cover_media_asset_id"
  },
  {
    table: "taxonomy_terms",
    idColumn: "id",
    urlField: "og_image_url",
    assetIdField: "og_image_asset_id"
  },
  {
    table: "platform_announcements",
    idColumn: "id",
    urlField: "og_image_url",
    assetIdField: "og_image_media_asset_id"
  }
];

type Suggestion = {
  table: string;
  id: string;
  urlField: string;
  assetIdField: string;
  currentValue: string;
  suggestedObjectKey: string | null;
  suggestedAssetId: string | null;
  action: "set_asset_id_and_object_key" | "set_object_key_only" | "skip_external" | "skip_unknown";
  reason?: string;
};

async function findAssetByPath(objectKey: string): Promise<string | null> {
  const result = await db.execute(sql`
    select id
    from public.storage_assets
    where path = ${objectKey}
      and status = 'active'
    order by created_at desc
    limit 1
  `);
  const row = result.rows[0] as { id?: string } | undefined;
  return row?.id ? String(row.id) : null;
}

function isExternalUrl(value: string): boolean {
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return false;
  }
  return extractObjectKeyFromPublicUrl(value) === null;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  const result = await db.execute(sql`
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = ${table} and column_name = ${column}
    ) as ok
  `);
  return Boolean((result.rows[0] as { ok?: boolean })?.ok);
}

async function scanTarget(
  target: MigrationTarget,
  limit: number,
  tableFilter?: string
): Promise<Suggestion[]> {
  if (tableFilter && target.table !== tableFilter) {
    return [];
  }

  if (!(await columnExists(target.table, target.urlField))) {
    return [];
  }
  if (!(await columnExists(target.table, target.assetIdField))) {
    return [];
  }

  const query = sql.raw(`
    select "${target.idColumn}" as row_id,
           "${target.urlField}" as url_val,
           "${target.assetIdField}" as asset_val
    from public."${target.table}"
    where "${target.urlField}" is not null
      and trim("${target.urlField}"::text) <> ''
      and ("${target.assetIdField}" is null)
    limit ${limit}
  `);

  const result = await db.execute(query);
  const suggestions: Suggestion[] = [];

  for (const row of result.rows as Array<{
    row_id: string;
    url_val: string;
    asset_val: string | null;
  }>) {
    const currentValue = String(row.url_val ?? "").trim();
    if (!currentValue) continue;

    if (isExternalUrl(currentValue)) {
      suggestions.push({
        table: target.table,
        id: String(row.row_id),
        urlField: target.urlField,
        assetIdField: target.assetIdField,
        currentValue,
        suggestedObjectKey: null,
        suggestedAssetId: null,
        action: "skip_external",
        reason: "External URL — not migrated"
      });
      continue;
    }

    const objectKey =
      extractObjectKeyFromPublicUrl(currentValue) ??
      (currentValue.includes("/") && !currentValue.startsWith("http") ? currentValue : null);

    if (!objectKey) {
      suggestions.push({
        table: target.table,
        id: String(row.row_id),
        urlField: target.urlField,
        assetIdField: target.assetIdField,
        currentValue,
        suggestedObjectKey: null,
        suggestedAssetId: null,
        action: "skip_unknown",
        reason: "Could not derive object_key"
      });
      continue;
    }

    const assetId = await findAssetByPath(objectKey);
    suggestions.push({
      table: target.table,
      id: String(row.row_id),
      urlField: target.urlField,
      assetIdField: target.assetIdField,
      currentValue,
      suggestedObjectKey: objectKey,
      suggestedAssetId: assetId,
      action: assetId ? "set_asset_id_and_object_key" : "set_object_key_only"
    });
  }

  return suggestions;
}

async function main() {
  const dryRun = !process.argv.includes("--apply");
  const backupArg = process.argv.find((a) => a.startsWith("--backup-file="));
  const tableArg = process.argv.find((a) => a.startsWith("--table="));
  const limitArg = process.argv.find((a) => a.startsWith("--limit="));
  const limit = limitArg ? Number(limitArg.split("=")[1]) : 500;
  const tableFilter = tableArg ? tableArg.split("=")[1] : undefined;

  if (!dryRun && !backupArg) {
    console.error("Refusing --apply without --backup-file=...");
    process.exit(2);
  }

  const allSuggestions: Suggestion[] = [];
  for (const target of TARGETS) {
    const rows = await scanTarget(target, limit, tableFilter);
    allSuggestions.push(...rows);
  }

  const applicable = allSuggestions.filter(
    (s) => s.action === "set_asset_id_and_object_key" || s.action === "set_object_key_only"
  );

  console.log(
    JSON.stringify(
      {
        mode: dryRun ? "dry-run" : "apply",
        scanned: allSuggestions.length,
        applicable: applicable.length,
        skippedExternal: allSuggestions.filter((s) => s.action === "skip_external").length,
        skippedUnknown: allSuggestions.filter((s) => s.action === "skip_unknown").length,
        suggestions: allSuggestions
      },
      null,
      2
    )
  );

  if (dryRun) {
    console.log("\nDry-run only — no rows updated.");
    return;
  }

  const backupPath = backupArg!.split("=")[1];
  writeFileSync(backupPath, JSON.stringify({ suggestions: allSuggestions }, null, 2), "utf8");

  for (const item of applicable) {
    if (item.action === "set_asset_id_and_object_key" && item.suggestedAssetId) {
      await db.execute(sql.raw(`
        update public."${item.table}"
        set "${item.assetIdField}" = '${item.suggestedAssetId}'::uuid,
            "${item.urlField}" = '${item.suggestedObjectKey!.replace(/'/g, "''")}'
        where "${TARGETS.find((t) => t.table === item.table)!.idColumn}" = '${item.id}'::uuid
      `));
    } else if (item.suggestedObjectKey) {
      await db.execute(sql.raw(`
        update public."${item.table}"
        set "${item.urlField}" = '${item.suggestedObjectKey.replace(/'/g, "''")}'
        where "${TARGETS.find((t) => t.table === item.table)!.idColumn}" = '${item.id}'::uuid
      `));
    }
  }

  console.log(`Applied ${applicable.length} updates. Backup: ${backupPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
