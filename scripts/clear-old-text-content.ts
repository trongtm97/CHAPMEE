/**
 * Clears legacy inline reels/community/comments text content after migration to S3.
 *
 * After the S3 migration scripts have uploaded legacy text bodies to Vietnix S3,
 * this script NULLs out the inline `body/title/hook/cta/content` columns and sets
 * `content_storage_type = 's3'` so the app no longer falls back to inline text.
 *
 * Idempotent: only touches rows where `content_storage_type = 'db'` AND an
 * `content_object_key` is set (i.e. already migrated). Rows still on 'db' with
 * no key are left alone (run backfill first).
 *
 *   npx tsx scripts/clear-old-text-content.ts
 *   npx tsx scripts/clear-old-text-content.ts --dry-run
 *   npx tsx scripts/clear-old-text-content.ts --table=reels_items
 *   npx tsx scripts/clear-old-text-content.ts --table=community_posts
 *   npx tsx scripts/clear-old-text-content.ts --table=comments
 */

import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { closePgPool, getPgPool } from "@/lib/db/pool";

loadEnvLocal();

const dryRun = process.argv.includes("--dry-run");
const tableArg = process.argv.find((arg) => arg.startsWith("--table="));
const targetTable = tableArg?.split("=")[1]?.trim() || "all";

type TableSpec = {
  name: string;
  clearedColumns: string[];
  whereClause: string;
};

const TABLES: Record<string, TableSpec> = {
  reels_items: {
    clearedColumns: ["title", "hook", "body", "cta"],
    name: "reels_items",
    whereClause: `coalesce(content_storage_type, 'db') = 'db'
       and content_object_key is not null
       and trim(content_object_key) <> ''`
  },
  community_posts: {
    clearedColumns: ["title", "content"],
    name: "community_posts",
    whereClause: `coalesce(content_storage_type, 'db') = 'db'
       and content_object_key is not null
       and trim(content_object_key) <> ''`
  },
  comments: {
    clearedColumns: ["content"],
    name: "comments",
    whereClause: `coalesce(content_storage_type, 'db') = 'db'
       and content_object_key is not null
       and trim(content_object_key) <> ''`
  }
};

async function clearTable(spec: TableSpec): Promise<number> {
  const pool = getPgPool();
  const setColumn = (col: string) => `${col} = null`;
  const setStorageType = `content_storage_type = 's3'`;
  const setUpdatedAt = `content_updated_at = coalesce(content_updated_at, now())`;
  const sql = `
    update public.${spec.name}
    set
      ${spec.clearedColumns.map(setColumn).join(",\n      ")},
      ${setStorageType},
      ${setUpdatedAt}
    where ${spec.whereClause}
    returning id
  `;

  if (dryRun) {
    const { rows } = await pool.query<{ id: string }>(
      `select id from public.${spec.name} where ${spec.whereClause}`
    );
    return rows.length;
  }

  const result = await pool.query<{ id: string }>(sql);
  return result.rowCount ?? 0;
}

async function main() {
  const tables =
    targetTable === "all"
      ? Object.values(TABLES)
      : TABLES[targetTable]
        ? [TABLES[targetTable]]
        : null;

  if (!tables) {
    console.error(`Unknown table: ${targetTable}`);
    console.error(`Valid options: ${Object.keys(TABLES).join(", ")}, all`);
    process.exit(1);
  }

  console.log(
    `[clear-old-text-content] ${dryRun ? "DRY-RUN" : "RUN"} mode on tables: ${tables.map((t) => t.name).join(", ")}`
  );

  for (const spec of tables) {
    const count = await clearTable(spec);
    console.log(
      `[clear-old-text-content] ${spec.name}: ${count} row(s) ${dryRun ? "would be cleared" : "cleared"}`
    );
  }
}

main()
  .then(async () => {
    await closePgPool();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[clear-old-text-content] failed", error);
    await closePgPool();
    process.exit(1);
  });
