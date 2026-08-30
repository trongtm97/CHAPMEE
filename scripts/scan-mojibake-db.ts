#!/usr/bin/env npx tsx
/**
 * Scan PostgreSQL text fields for mojibake (read-only).
 *
 *   npm run mojibake:scan:db
 *   npm run mojibake:scan:db -- --limit=100 --table=stories
 *   npm run mojibake:scan:db -- --json
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { getPgPool, closePgPool } from "@/lib/db/pool";
import { scanMojibakeInDb } from "@/lib/encoding/db-mojibake-scan";
import { DB_MOJIBAKE_TEXT_FIELDS } from "@/lib/encoding/db-text-fields";

loadEnvLocal();

function parseArgs() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  const tableArg = argv.find((a) => a.startsWith("--table="));
  const limitArg = argv.find((a) => a.startsWith("--limit="));
  return {
    json,
    table: tableArg?.split("=")[1],
    limit: limitArg ? Number(limitArg.split("=")[1]) : 100
  };
}

async function main() {
  const { json, table, limit } = parseArgs();
  const pool = getPgPool();

  try {
    const result = await scanMojibakeInDb({
      pool,
      tableFilter: table,
      limitPerField: limit
    });

    const high = result.hits.filter((h) => h.confidence === "high");
    const medium = result.hits.filter((h) => h.confidence === "medium");
    const low = result.hits.filter((h) => h.confidence === "low");

    const summary = {
      scannedFieldSpecs: DB_MOJIBAKE_TEXT_FIELDS.length,
      scannedFieldsExisting: result.scannedFields,
      suspiciousRows: result.hits.length,
      highConfidence: high.length,
      mediumConfidence: medium.length,
      lowConfidence: low.length,
      skipped: result.skipped,
      hits: result.hits
    };

    if (json) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`Scanned ${result.scannedFields} field(s) (whitelist ${DB_MOJIBAKE_TEXT_FIELDS.length}).`);
      if (result.skipped.length) {
        console.log(`Skipped: ${result.skipped.join(", ")}`);
      }
      console.log(
        `Suspicious rows: ${result.hits.length} (high=${high.length}, medium=${medium.length}, low=${low.length})`
      );
      for (const hit of result.hits.slice(0, 50)) {
        console.log(
          `\n${hit.table}.${hit.field} id=${hit.id} [${hit.confidence} ${hit.score.toFixed(2)}]`
        );
        console.log(`  current: ${hit.currentExcerpt}`);
        console.log(`  repair:  ${hit.repairedExcerpt}`);
        console.log(`  reasons: ${hit.reasons.join(", ")}`);
      }
      if (result.hits.length > 50) {
        console.log(`\n… and ${result.hits.length - 50} more (use --json for full list).`);
      }
    }

    process.exit(result.hits.length > 0 ? 1 : 0);
  } finally {
    await closePgPool();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
