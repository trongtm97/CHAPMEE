#!/usr/bin/env npx tsx
/**
 * Dry-run or apply mojibake repairs on PostgreSQL text fields (with backup).
 *
 *   npm run mojibake:repair:db -- --dry-run --limit=100
 *   npm run mojibake:repair:db -- --apply --backup-file=backups/mojibake-repair-2026-06-03.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { getPgPool, closePgPool } from "@/lib/db/pool";
import { getFieldsForTable } from "@/lib/encoding/db-text-fields";
import {
  fetchRowFieldValue,
  scanMojibakeInDb,
  type MojibakeDbHit
} from "@/lib/encoding/db-mojibake-scan";
import {
  isHighConfidenceRepair,
  previewMojibakeRepair,
  shouldRepairField
} from "@/lib/encoding/mojibake-repair";

loadEnvLocal();

type BackupRow = {
  table: string;
  field: string;
  id: string;
  before: string;
  after: string;
  confidence: string;
  score: number;
  reasons: string[];
};

type BackupFile = {
  createdAt: string;
  database: string;
  mode: "dry-run" | "apply";
  rows: BackupRow[];
};

function parseArgs() {
  const argv = process.argv.slice(2);
  const apply = argv.includes("--apply");
  const dryRun = argv.includes("--dry-run") || !apply;
  const backupArg = argv.find((a) => a.startsWith("--backup-file="));
  const tableArg = argv.find((a) => a.startsWith("--table="));
  const fieldArg = argv.find((a) => a.startsWith("--field="));
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  return {
    apply,
    dryRun,
    backupFile: backupArg?.split("=").slice(1).join("="),
    table: tableArg?.split("=")[1],
    field: fieldArg?.split("=")[1],
    limit: limitArg ? Number(limitArg.split("=")[1]) : 500
  };
}

function quoteIdent(name: string) {
  return `"${name.replace(/"/g, '""')}"`;
}

async function applyUpdate(
  pool: ReturnType<typeof getPgPool>,
  row: BackupRow
): Promise<boolean> {
  const t = quoteIdent(row.table);
  const f = quoteIdent(row.field);
  const idCol = quoteIdent("id");
  const sql = `
    UPDATE ${t}
    SET ${f} = $1
    WHERE ${idCol} = $2 AND ${f} = $3
  `;
  const result = await pool.query(sql, [row.after, row.id, row.before]);
  return (result.rowCount ?? 0) > 0;
}

async function buildRepairPlan(hits: MojibakeDbHit[], pool: ReturnType<typeof getPgPool>) {
  const plan: BackupRow[] = [];
  const manual: MojibakeDbHit[] = [];

  for (const hit of hits) {
    if (!hit.repairable || !shouldRepairField(hit.table, hit.field)) {
      manual.push(hit);
      continue;
    }

    const spec = getFieldsForTable(hit.table).find((s) => s.field === hit.field);
    if (!spec) continue;

    const full = await fetchRowFieldValue(pool, spec, hit.id);
    if (!full) continue;

    const preview = previewMojibakeRepair(full);
    if (!isHighConfidenceRepair(preview)) {
      manual.push(hit);
      continue;
    }

    plan.push({
      table: hit.table,
      field: hit.field,
      id: hit.id,
      before: preview.original,
      after: preview.repaired,
      confidence: preview.confidence,
      score: preview.score,
      reasons: preview.reasons
    });
  }

  return { plan, manual };
}

async function main() {
  const args = parseArgs();

  if (args.apply && !args.backupFile) {
    console.error("Refusing --apply without --backup-file=. Export a backup JSON path first.");
    process.exit(1);
  }

  const pool = getPgPool();

  try {
    const dbName = (await pool.query<{ datname: string }>("SELECT current_database() AS datname"))
      .rows[0]?.datname;

    const scan = await scanMojibakeInDb({
      pool,
      tableFilter: args.table,
      fieldFilter: args.field,
      limitPerField: args.limit
    });

    const { plan, manual } = await buildRepairPlan(scan.hits, pool);

    const backup: BackupFile = {
      createdAt: new Date().toISOString(),
      database: dbName ?? "unknown",
      mode: args.apply ? "apply" : "dry-run",
      rows: plan
    };

    if (args.backupFile) {
      const abs = path.resolve(args.backupFile);
      await mkdir(path.dirname(abs), { recursive: true });
      await writeFile(abs, `${JSON.stringify(backup, null, 2)}\n`, "utf8");
      console.log(`Backup written: ${abs} (${plan.length} row(s))`);
    }

    console.log(`Scan hits: ${scan.hits.length}`);
    console.log(`High-confidence repair plan: ${plan.length}`);
    console.log(`Manual review: ${manual.length}`);

    if (args.dryRun) {
      for (const row of plan.slice(0, 30)) {
        console.log(
          `[dry-run] ${row.table}.${row.field} id=${row.id} score=${row.score.toFixed(2)}`
        );
      }
      if (plan.length > 30) console.log(`… ${plan.length - 30} more in backup file.`);
      console.log("\nDry-run only — no database updates.");
      process.exit(0);
    }

    let applied = 0;
    let failed = 0;
    for (const row of plan) {
      const ok = await applyUpdate(pool, row);
      if (ok) {
        applied += 1;
        console.log(`[applied] ${row.table}.${row.field} id=${row.id}`);
      } else {
        failed += 1;
        console.warn(`[skipped] ${row.table}.${row.field} id=${row.id} (row changed or not found)`);
      }
    }

    console.log(`\nApplied: ${applied}, failed/skipped: ${failed}, manual review: ${manual.length}`);
    process.exit(failed > 0 ? 1 : 0);
  } finally {
    await closePgPool();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
