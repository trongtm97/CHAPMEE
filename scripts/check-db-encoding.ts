#!/usr/bin/env npx tsx
/**
 * Read-only PostgreSQL encoding check.
 *
 *   npm run db:encoding
 */
import "./lib/register-server-only";
import { loadEnvLocal } from "./lib/load-env-local";
import { getPgPool, closePgPool } from "@/lib/db/pool";

loadEnvLocal();

type EncodingRow = {
  server_encoding: string;
  client_encoding: string;
  lc_collate: string;
  lc_ctype: string;
  datname: string;
  db_encoding: string;
};

async function main() {
  const pool = getPgPool();
  try {
    const result = await pool.query<EncodingRow>(`
      SELECT
        current_setting('server_encoding') AS server_encoding,
        current_setting('client_encoding') AS client_encoding,
        (SELECT datcollate FROM pg_database WHERE datname = current_database()) AS lc_collate,
        (SELECT datctype FROM pg_database WHERE datname = current_database()) AS lc_ctype,
        current_database() AS datname,
        pg_encoding_to_char(encoding) AS db_encoding
      FROM pg_database
      WHERE datname = current_database()
      LIMIT 1
    `);

    const row = result.rows[0];
    if (!row) {
      console.error("Could not read database encoding settings.");
      process.exit(1);
    }

    console.log("PostgreSQL encoding (read-only):");
    console.log(`  database:         ${row.datname}`);
    console.log(`  db_encoding:      ${row.db_encoding}`);
    console.log(`  server_encoding:  ${row.server_encoding}`);
    console.log(`  client_encoding:  ${row.client_encoding}`);
    console.log(`  lc_collate:       ${row.lc_collate}`);
    console.log(`  lc_ctype:         ${row.lc_ctype}`);

    const ok =
      row.server_encoding.toUpperCase() === "UTF8" &&
      row.client_encoding.toUpperCase() === "UTF8" &&
      row.db_encoding.toUpperCase() === "UTF8";

    if (!ok) {
      console.error("\nExpected UTF8 for server, client, and database encoding.");
      process.exit(1);
    }

    console.log("\nOK — database uses UTF8.");
  } finally {
    await closePgPool();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
